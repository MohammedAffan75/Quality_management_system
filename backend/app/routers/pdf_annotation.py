"""
PDF Annotation router for extracting text, GDT, and dimensions from PDFs.
Works with balloons stored in the database.
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict
from pathlib import Path
import logging
import sys

from app.database import get_db
from app.models.document import Document, DocumentType
from app.models.document_version import DocumentVersion
from app.models.balloon import Balloon
from app.services.blob_storage import blob_storage
from app.schemas.pdf_annotation import (
    BoundingBox,
    ExtractTextRequest,
    ProcessDimensionsRequest,
    SaveBoundingBoxRequest,
    UpdateBoundingBoxRequest
)

# Backend2 standalone: add backend2 root to path so we load our own utils (no dependency on backend package)
_backend2_root = Path(__file__).resolve().parent.parent.parent  # backend2/
if str(_backend2_root) not in sys.path:
    sys.path.insert(0, str(_backend2_root))

# All utilities live in backend2 root: text_extractor, ocr_extractor, dimension_parser, gdt_detector, qms.zone
try:
    from text_extractor import TextExtractor as PyMuPDFTextExtractor
except ImportError as e:
    logging.warning("PyMuPDF text extractor not available: %s", e)
    PyMuPDFTextExtractor = None

try:
    from ocr_extractor import TextExtractor as OCRTextExtractor
except ImportError as e:
    logging.warning("OCR extractor not available (install easyocr for scanned PDFs): %s", e)
    OCRTextExtractor = None

try:
    from gdt_detector import get_gdt_detector
    from dimension_parser import DimensionParser
except ImportError as e:
    logging.warning("GDT/dimension utils not available: %s", e)
    get_gdt_detector = None
    DimensionParser = None

try:
    from qms.zone import ZoneDetector
except ImportError as e:
    logging.debug("ZoneDetector not available: %s", e)
    ZoneDetector = None

# Alias for code that still uses "TextExtractor" (PyMuPDF path)
TextExtractor = PyMuPDFTextExtractor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pdf-annotation", tags=["pdf_annotation"])

# OCR extractor singleton for scanned PDFs
_ocr_extractor_instance = None


def get_ocr_extractor():
    """Get or create OCR extractor instance (for scanned PDFs)."""
    global _ocr_extractor_instance
    if _ocr_extractor_instance is None and OCRTextExtractor is not None:
        try:
            _ocr_extractor_instance = OCRTextExtractor(languages=["en"], gpu=False)
            logger.info("OCR extractor initialized for scanned PDFs")
        except Exception as e:
            logger.error(f"Failed to initialize OCR extractor: {e}", exc_info=True)
    return _ocr_extractor_instance


def get_pdf_type(document_id: int, db: Session) -> str:
    """Get PDF content type (normal or scanned) for a 2D document. Default 'normal'."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        return "normal"
    if document.doc_type != DocumentType.TWO_D:
        return "normal"
    return (getattr(document, "pdf_content_type", None) or "normal").strip().lower() or "normal"


def get_pdf_path_from_document(document_id: int, db: Session) -> str:
    """Get PDF file path from document ID."""
    # Get current version of document
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found"
        )
    
    # Get current version
    current_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.is_current == True
    ).first()
    
    if not current_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No current version found for document {document_id}"
        )
    
    # Get file path from blob storage
    try:
        file_path = blob_storage.get_file_path(current_version.blob_path)
        return str(file_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found for document version {current_version.id}"
        )


@router.post("/extract-text")
async def extract_text(request: ExtractTextRequest, db: Session = Depends(get_db)):
    """Extract text from a specific region of a PDF page. Uses OCR for scanned PDFs, PyMuPDF for normal."""
    # Validate part exists
    from app.models.part import Part
    part = db.query(Part).filter(Part.id == request.part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part with ID {request.part_id} not found"
        )
    
    try:
        if not request.pdf_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pdf_id is required for text extraction"
            )
        try:
            document_id = int(request.pdf_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pdf_id must be a valid document ID (integer)"
            )
        file_path = get_pdf_path_from_document(document_id, db)
        pdf_type = get_pdf_type(document_id, db)
        logger.info(f"PDF type: {pdf_type} for document {document_id}")
        
        page_number = request.bounding_box.page - 1
        region = {
            "x": request.bounding_box.x,
            "y": request.bounding_box.y,
            "width": request.bounding_box.width,
            "height": request.bounding_box.height,
        }
        
        if pdf_type == "scanned":
            ocr_extractor = get_ocr_extractor()
            if not ocr_extractor:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="OCR not available for scanned PDFs. Ensure EasyOCR is installed."
                )
            # Try all rotations when user hasn't set one (scanned text can be at any orientation)
            rotation_angles = [request.rotation_angle] if request.rotation_angle is not None else [0, 90, 180, 270]
            if request.check_overlaps and request.existing_boxes:
                results = ocr_extractor.extract_text_with_overlap_check(
                    pdf_path=str(file_path),
                    page_number=page_number,
                    region=region,
                    existing_boxes=request.existing_boxes,
                    iou_threshold=request.iou_threshold,
                    scale_factor=request.scale_factor,
                    confidence_threshold=0.5,
                    rotation_angles=rotation_angles,
                )
            else:
                results = ocr_extractor.extract_text_from_region(
                    pdf_path=str(file_path),
                    page_number=page_number,
                    region=region,
                    scale_factor=request.scale_factor,
                    confidence_threshold=0.5,
                    rotation_angles=rotation_angles,
                )
        else:
            if not PyMuPDFTextExtractor:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Text extraction service not available"
                )
            if request.check_overlaps and request.existing_boxes:
                results = PyMuPDFTextExtractor.extract_text_with_overlap_check(
                    pdf_path=str(file_path),
                    page_number=page_number,
                    region=region,
                    existing_boxes=request.existing_boxes,
                    iou_threshold=request.iou_threshold,
                    scale_factor=request.scale_factor,
                )
            else:
                results = PyMuPDFTextExtractor.extract_text_from_region(
                    pdf_path=str(file_path),
                    page_number=page_number,
                    region=region,
                    scale_factor=request.scale_factor,
                )
        
        return {"success": True, "detections": results, "count": len(results)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting text: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")


@router.post("/extract-gdt")
async def extract_gdt(request: ExtractTextRequest, db: Session = Depends(get_db)):
    """Detect GDT symbols from a specific region of a PDF page."""
    if not get_gdt_detector:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GDT detection service not available"
        )
    
    # Validate part exists
    from app.models.part import Part
    part = db.query(Part).filter(Part.id == request.part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part with ID {request.part_id} not found"
        )
    
    try:
        # Get PDF path from document if provided
        if not request.pdf_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pdf_id is required for GDT extraction"
            )
        
        try:
            document_id = int(request.pdf_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pdf_id must be a valid document ID (integer)"
            )
        file_path = get_pdf_path_from_document(document_id, db)
        
        # Get GDT detector - try multiple possible paths
        import os
        from pathlib import Path
        
        # Try to find the model file in common locations
        backend_dir = Path(__file__).parent.parent.parent
        model_paths = [
            'best2.pt',  # Current directory
            str(backend_dir / 'best2.pt'),  # Backend root
            str(backend_dir / 'backend2' / 'best2.pt'),  # Backend2 directory
        ]
        
        model_path = None
        for path in model_paths:
            if Path(path).exists():
                model_path = path
                logger.info(f"Found GDT model at: {model_path}")
                break
        
        if not model_path:
            logger.warning(f"GDT model not found in any of these locations: {model_paths}")
            model_path = 'best2.pt'  # Fallback to default
        
        gdt_detector = get_gdt_detector(model_path)
        
        if not gdt_detector or not gdt_detector.model:
            raise HTTPException(
                status_code=503,
                detail=f"GDT detection not available. YOLO model not loaded. Tried paths: {model_paths}"
            )
        
        page_number = request.bounding_box.page - 1
        region = {
            'x': request.bounding_box.x,
            'y': request.bounding_box.y,
            'width': request.bounding_box.width,
            'height': request.bounding_box.height
        }
        
        # Detect GDT symbols with confidence threshold
        logger.info(f"Detecting GDT symbols in region: {region} on page {page_number}")
        logger.debug(f"PDF path: {file_path}, scale_factor: {request.scale_factor}")
        
        results = gdt_detector.detect_gdt_symbols_from_pdf_region(
            pdf_path=str(file_path),
            page_number=page_number,
            region=region,
            confidence_threshold=0.5,  # Default confidence threshold
            scale_factor=request.scale_factor
        )
        
        logger.info(f"GDT detection completed. Found {len(results)} symbols")
        if results:
            logger.debug(f"GDT symbols detected: {[r.get('class_name', 'unknown') for r in results]}")
        
        return {
            "success": True,
            "detections": results,
            "count": len(results)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detecting GDT: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error detecting GDT: {str(e)}")


@router.post("/process-dimensions")
async def process_dimensions(request: ProcessDimensionsRequest, db: Session = Depends(get_db)):
    """
    Process dimensions: Extract text, detect GDT, and parse dimensions.
    Uses OCR for scanned PDFs, PyMuPDF for normal PDFs.
    """
    import re
    
    if not DimensionParser:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dimension parsing service not available"
        )
    
    # Validate part exists
    from app.models.part import Part
    part = db.query(Part).filter(Part.id == request.part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part with ID {request.part_id} not found"
        )
    
    try:
        if not request.pdf_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pdf_id is required for dimension processing"
            )
        try:
            document_id = int(request.pdf_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pdf_id must be a valid document ID (integer)"
            )
        file_path = get_pdf_path_from_document(document_id, db)
        pdf_type = get_pdf_type(document_id, db)
        logger.info(f"PDF type: {pdf_type} for document {document_id}")
        
        page_number = request.bounding_box.page - 1
        region = {
            "x": request.bounding_box.x,
            "y": request.bounding_box.y,
            "width": request.bounding_box.width,
            "height": request.bounding_box.height,
        }
        
        # Step 1: Extract text (OCR for scanned, PyMuPDF for normal)
        logger.info("Step 1: Extracting text...")
        logger.info(f"Region coordinates: x={region['x']}, y={region['y']}, width={region['width']}, height={region['height']}")
        
        if pdf_type == "scanned":
            ocr_extractor = get_ocr_extractor()
            if not ocr_extractor:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="OCR not available for scanned PDFs. Ensure EasyOCR is installed."
                )
            # Try all rotations when user hasn't set one (scanned text can be at any orientation)
            rotation_angles = [request.rotation_angle] if request.rotation_angle is not None else [0, 90, 180, 270]
            if request.check_overlaps and request.existing_boxes:
                text_results = ocr_extractor.extract_text_with_overlap_check(
                    pdf_path=str(file_path),
                    page_number=page_number,
                    region=region,
                    existing_boxes=request.existing_boxes,
                    iou_threshold=request.iou_threshold,
                    scale_factor=request.scale_factor,
                    confidence_threshold=0.5,
                    rotation_angles=rotation_angles,
                )
            else:
                text_results = ocr_extractor.extract_text_from_region(
                    pdf_path=str(file_path),
                    page_number=page_number,
                    region=region,
                    scale_factor=request.scale_factor,
                    confidence_threshold=0.5,
                    rotation_angles=rotation_angles,
                )
        else:
            if not PyMuPDFTextExtractor:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Text extraction service not available"
                )
            if request.check_overlaps and request.existing_boxes:
                text_results = PyMuPDFTextExtractor.extract_text_with_overlap_check(
                    pdf_path=str(file_path),
                    page_number=page_number,
                    region=region,
                    existing_boxes=request.existing_boxes,
                    iou_threshold=request.iou_threshold,
                    scale_factor=request.scale_factor,
                )
            else:
                text_results = PyMuPDFTextExtractor.extract_text_from_region(
                    pdf_path=str(file_path),
                    page_number=page_number,
                    region=region,
                    scale_factor=request.scale_factor,
                )
        logger.info(f"✓ Extracted {len(text_results)} text detections")
        
        if len(text_results) == 0:
            logger.warning("⚠ No text found in the selected region. Check if coordinates are correct.")
        else:
            # Log first few text items for debugging
            sample_texts = [item.get('text', '') or item.get('content', '') for item in text_results[:5]]
            logger.info(f"Sample extracted texts: {sample_texts}")
        
        # Step 2: Detect GDT symbols
        logger.info("Step 2: Detecting GDT symbols...")
        gdt_results = []
        try:
            if get_gdt_detector:
                # Try to find the model file in common locations
                backend_dir = Path(__file__).parent.parent.parent
                model_paths = [
                    str(backend_dir / 'best2.pt'),  # Backend2 root
                    'best2.pt',  # Current directory
                ]
                
                model_path = None
                for path in model_paths:
                    if Path(path).exists():
                        model_path = path
                        logger.info(f"Found GDT model at: {model_path}")
                        break
                
                if not model_path:
                    logger.warning(f"GDT model not found in any of these locations: {model_paths}")
                    model_path = str(backend_dir / 'best2.pt')  # Fallback to default
                
                gdt_detector = get_gdt_detector(model_path)
                
                if gdt_detector and gdt_detector.model:
                    gdt_results = gdt_detector.detect_gdt_symbols_from_pdf_region(
                        pdf_path=str(file_path),
                        page_number=page_number,
                        region=region,
                        confidence_threshold=0.5,
                        scale_factor=request.scale_factor
                    )
                    logger.info(f"Detected {len(gdt_results)} GDT symbols")
                else:
                    logger.warning("GDT detector model not available, skipping GDT detection")
            else:
                logger.warning("GDT detector not available, skipping GDT detection")
        except Exception as e:
            logger.warning(f"GDT detection failed: {str(e)}, continuing without GDT data")
        
        # Step 3: Parse dimensions from extracted text
        logger.info("Step 3: Parsing dimensions from extracted text...")
        dimension_results = []
        processed_texts = set()
        
        for text_item in text_results:
            text_content = text_item.get('text', '') or text_item.get('content', '')
            if not text_content or not text_content.strip():
                continue
            
            text_content = text_content.strip()
            
            # Skip if already processed
            if text_content in processed_texts:
                continue
            
            logger.debug(f"Checking text for dimension: '{text_content}'")
            
            # Check if this text is a dimensional value
            is_dim = DimensionParser.is_dimensional_value(text_content)
            
            if is_dim:
                try:
                    dim_type, upper_tol, lower_tol, nominal_value = DimensionParser.parse_dimension(text_content)
                    logger.info(f"✓ Parsed dimension: '{text_content}' -> type={dim_type}, nominal={nominal_value}, utol={upper_tol}, ltol={lower_tol}")
                    dimension_results.append({
                        'text': text_content,
                        'nominal_value': nominal_value,
                        'upper_tolerance': upper_tol,
                        'lower_tolerance': lower_tol,
                        'dimension_type': dim_type,
                        'bbox': text_item.get('box', text_item.get('bbox', []))
                    })
                    processed_texts.add(text_content)
                except Exception as e:
                    logger.error(f"Error parsing dimension '{text_content}': {str(e)}")
        
        logger.info(f"✓ Parsed {len(dimension_results)} dimensions from {len(text_results)} text items")
        
        # Step 4: Process GDT symbols as dimensions
        logger.info("Step 4: Processing GDT symbols as dimensions...")
        gdt_dimension_results = []
        gdt_associated_texts = set()  # Track text items associated with GDT symbols
        
        for gdt_item in gdt_results:
            gdt_symbol = gdt_item.get('class_name', 'Unknown')
            gdt_box = gdt_item.get('box', [])
            gdt_confidence = gdt_item.get('confidence', 0.0)
            
            # When best2.pt detects a diameter symbol, we will use dimension_type "Diameter"
            gdt_symbol_stripped = (gdt_symbol or '').strip()
            diameter_chars = ('ø', 'Ø', '∅', '⌀')
            is_diameter_gdt = (
                any(gdt_symbol_stripped.startswith(c) for c in diameter_chars)
                or any(c in gdt_symbol_stripped for c in diameter_chars)
                or 'diameter' in gdt_symbol_stripped.lower()
                or gdt_symbol_stripped.lower() == 'dia'
                or (len(gdt_symbol_stripped) <= 4 and 'dia' in gdt_symbol_stripped.lower())
            )
            
            # Try to find associated tolerance value near the GDT symbol (or for diameter: full dimension text like "83 ±0.15")
            tolerance_value = None
            tolerance_text = None
            associated_text_item = None
            diameter_nominal = None
            diameter_upper_tol = ''
            diameter_lower_tol = ''
            
            if gdt_box and len(gdt_box) >= 2:
                # Get bounding box of GDT symbol
                gdt_x_coords = [p[0] for p in gdt_box]
                gdt_y_coords = [p[1] for p in gdt_box]
                gdt_min_x = min(gdt_x_coords)
                gdt_max_x = max(gdt_x_coords)
                gdt_min_y = min(gdt_y_coords)
                gdt_max_y = max(gdt_y_coords)
                gdt_center_x = sum(gdt_x_coords) / len(gdt_x_coords)
                gdt_center_y = sum(gdt_y_coords) / len(gdt_y_coords)
                
                # Expand search area: larger for diameter so we catch vertical callouts (e.g. "Ø 78 ±0.15" stacked)
                search_distance = 350 if is_diameter_gdt else 100
                # For vertical diameter callouts: same column = within this horizontal band
                vertical_column_x_tolerance = 80
                vertical_column_y_range = 400
                
                # For diameter GDT: find nearby text that looks like a dimension (e.g. "83 ±0.15", "86 ±0.15")
                # so we use its nominal and tolerances instead of treating it as a separate Length dimension
                if is_diameter_gdt:
                    closest_diameter_distance = float('inf')
                    for text_item in text_results:
                        text_box = text_item.get('box', [])
                        if not text_box or len(text_box) < 2:
                            continue
                        text_content = (text_item.get('text', '') or text_item.get('content', '') or '').strip()
                        if not text_content:
                            continue
                        if not DimensionParser.is_dimensional_value(text_content):
                            continue
                        try:
                            _dim_type, _upper, _lower, _nominal = DimensionParser.parse_dimension(text_content)
                        except Exception:
                            continue
                        try:
                            nom_float = float(str(_nominal).replace(',', '.'))
                        except (ValueError, TypeError):
                            continue
                        # Reasonable diameter nominal (e.g. 1.5, 14, 83, 86, 104)
                        if nom_float < 0.5:
                            continue
                        text_center_x = sum([p[0] for p in text_box]) / len(text_box)
                        text_center_y = sum([p[1] for p in text_box]) / len(text_box)
                        distance = ((text_center_x - gdt_center_x) ** 2 + (text_center_y - gdt_center_y) ** 2) ** 0.5
                        # For vertical callouts: also accept text in same column (similar X, different Y)
                        in_vertical_column = (abs(text_center_x - gdt_center_x) <= vertical_column_x_tolerance
                                              and abs(text_center_y - gdt_center_y) <= vertical_column_y_range)
                        if (distance < search_distance or in_vertical_column) and distance < closest_diameter_distance:
                            closest_diameter_distance = distance
                            diameter_nominal = _nominal
                            diameter_upper_tol = _upper or ''
                            diameter_lower_tol = _lower or ''
                            tolerance_value = _nominal
                            tolerance_text = text_content.strip()
                            associated_text_item = text_item
                    if diameter_nominal is not None:
                        logger.info(f"✓ Diameter GDT '{gdt_symbol}' associated with dimension text: nominal={diameter_nominal}, utol={diameter_upper_tol}, ltol={diameter_lower_tol}")
                    
                    # Fallback for vertical diameter: combine vertically stacked text (e.g. "78" and "±0.15" in same column)
                    if diameter_nominal is None and text_results:
                        stack_items = []
                        for text_item in text_results:
                            text_box = text_item.get('box', [])
                            if not text_box or len(text_box) < 2:
                                continue
                            text_content = (text_item.get('text', '') or text_item.get('content', '') or '').strip()
                            if not text_content:
                                continue
                            tc_x = sum([p[0] for p in text_box]) / len(text_box)
                            tc_y = sum([p[1] for p in text_box]) / len(text_box)
                            if abs(tc_x - gdt_center_x) <= vertical_column_x_tolerance and abs(tc_y - gdt_center_y) <= vertical_column_y_range:
                                stack_items.append((tc_y, text_content, text_item))
                        if stack_items:
                            stack_items.sort(key=lambda t: t[0])
                            combined = ' '.join(t[1] for t in stack_items)
                            # Remove diameter symbols from combined so parse sees "78 ±0.15"
                            for sym in ('ø', 'Ø', '∅', '⌀'):
                                combined = combined.replace(sym, '').strip()
                            combined = ' '.join(combined.split())
                            if combined and DimensionParser.is_dimensional_value(combined):
                                try:
                                    _dt, _ut, _lt, _nom = DimensionParser.parse_dimension(combined)
                                    nom_float = float(str(_nom).replace(',', '.'))
                                    if nom_float >= 0.5:
                                        diameter_nominal = _nom
                                        diameter_upper_tol = _ut or ''
                                        diameter_lower_tol = _lt or ''
                                        tolerance_value = _nom
                                        tolerance_text = combined
                                        associated_text_item = stack_items[0][2]
                                        logger.info(f"✓ Diameter GDT '{gdt_symbol}' from vertical stack: nominal={diameter_nominal}, combined='{combined}'")
                                except Exception:
                                    pass
                
                # Fallback for diameter: if no nearby text in text_results, match from parsed dimension_results by bbox
                if is_diameter_gdt and associated_text_item is None and dimension_results:
                    closest_dim_dist = float('inf')
                    for dim in dimension_results:
                        dim_bbox = dim.get('bbox') or []
                        if not dim_bbox or len(dim_bbox) < 2:
                            continue
                        try:
                            nom_float = float(str(dim.get('nominal_value', '')).replace(',', '.').strip())
                        except (ValueError, TypeError):
                            continue
                        if nom_float < 0.5:
                            continue
                        dim_cx = sum(p[0] for p in dim_bbox) / len(dim_bbox)
                        dim_cy = sum(p[1] for p in dim_bbox) / len(dim_bbox)
                        dist = ((dim_cx - gdt_center_x) ** 2 + (dim_cy - gdt_center_y) ** 2) ** 0.5
                        in_col = (abs(dim_cx - gdt_center_x) <= vertical_column_x_tolerance
                                  and abs(dim_cy - gdt_center_y) <= vertical_column_y_range)
                        if (dist < search_distance or in_col) and dist < closest_dim_dist:
                            closest_dim_dist = dist
                            diameter_nominal = dim.get('nominal_value')
                            diameter_upper_tol = dim.get('upper_tolerance') or ''
                            diameter_lower_tol = dim.get('lower_tolerance') or ''
                            tolerance_value = dim.get('nominal_value')
                            tolerance_text = dim.get('text', '')
                            if tolerance_text:
                                gdt_associated_texts.add(tolerance_text.strip())
                    if diameter_nominal is not None:
                        logger.info(f"✓ Diameter GDT '{gdt_symbol}' matched from dimension_results: nominal={diameter_nominal}")
                
                # Search for text near the GDT symbol (tolerance-only when not already set by diameter logic)
                closest_distance = float('inf')
                if associated_text_item is None:
                    for text_item in text_results:
                        text_box = text_item.get('box', [])
                        if not text_box or len(text_box) < 2:
                            continue
                        
                        # Get text bounding box
                        text_x_coords = [p[0] for p in text_box]
                        text_y_coords = [p[1] for p in text_box]
                        text_min_x = min(text_x_coords)
                        text_max_x = max(text_x_coords)
                        text_min_y = min(text_y_coords)
                        text_max_y = max(text_y_coords)
                        text_center_x = sum(text_x_coords) / len(text_x_coords)
                        text_center_y = sum(text_y_coords) / len(text_y_coords)
                        
                        # Calculate distance from GDT center to text center
                        distance = ((text_center_x - gdt_center_x) ** 2 + (text_center_y - gdt_center_y) ** 2) ** 0.5
                        
                        # Check if text box overlaps or is adjacent to GDT box
                        horizontal_overlap = not (text_max_x < gdt_min_x - search_distance or text_min_x > gdt_max_x + search_distance)
                        vertical_overlap = not (text_max_y < gdt_min_y - search_distance or text_min_y > gdt_max_y + search_distance)
                        
                        # If text is within search distance or overlaps
                        if distance < search_distance or (horizontal_overlap and vertical_overlap):
                            text_content = text_item.get('text', '') or text_item.get('content', '')
                            if not text_content:
                                continue
                            
                            text_content = text_content.strip()
                            
                            # Check if it's a numeric value (tolerance)
                            try:
                                parsed_value = float(text_content.replace(',', '.').strip())
                                if parsed_value > 0 and parsed_value < 10:  # Reasonable tolerance range
                                    if distance < closest_distance:
                                        closest_distance = distance
                                        tolerance_value = text_content.strip()
                                        tolerance_text = text_content.strip()
                                        associated_text_item = text_item
                                        logger.debug(f"Found tolerance value '{tolerance_value}' near GDT symbol '{gdt_symbol}' (distance: {distance:.1f})")
                            except ValueError:
                                # Not a simple number, try to extract number from text
                                number_match = re.search(r'(\d+\.?\d*)', text_content)
                                if number_match:
                                    try:
                                        extracted_value = float(number_match.group(1))
                                        if extracted_value > 0 and extracted_value < 10:
                                            if distance < closest_distance:
                                                closest_distance = distance
                                                tolerance_value = number_match.group(1)
                                                tolerance_text = text_content.strip()
                                                associated_text_item = text_item
                                                logger.debug(f"Extracted tolerance '{tolerance_value}' from text '{text_content}' near GDT symbol '{gdt_symbol}' (distance: {distance:.1f})")
                                    except ValueError:
                                        pass
                
                # If we found a tolerance value, log it
                if tolerance_value:
                    logger.info(f"✓ GDT '{gdt_symbol}' has tolerance value: {tolerance_value}")
                else:
                    logger.warning(f"⚠ No tolerance value found near GDT symbol '{gdt_symbol}'")
            
            # Mark associated text as used by GDT (to exclude from text dimensions)
            if associated_text_item:
                text_content = associated_text_item.get('text', '') or associated_text_item.get('content', '')
                if text_content:
                    gdt_associated_texts.add(text_content.strip())
            
            # Fallback search: look for tolerance values in entire extracted text
            if not tolerance_value and text_results:
                logger.debug(f"Fallback: Searching all extracted text for GDT '{gdt_symbol}' tolerance value...")
                
                text_candidates = []
                
                if gdt_box and len(gdt_box) >= 2:
                    gdt_center_x = sum([p[0] for p in gdt_box]) / len(gdt_box)
                    gdt_center_y = sum([p[1] for p in gdt_box]) / len(gdt_box)
                    
                    for text_item in text_results:
                        text_content = text_item.get('text', '') or text_item.get('content', '')
                        if not text_content:
                            continue
                        
                        text_box = text_item.get('box', [])
                        if text_box and len(text_box) >= 2:
                            text_center_x = sum([p[0] for p in text_box]) / len(text_box)
                            text_center_y = sum([p[1] for p in text_box]) / len(text_box)
                            distance = ((text_center_x - gdt_center_x) ** 2 + (text_center_y - gdt_center_y) ** 2) ** 0.5
                            text_candidates.append((distance, text_content.strip(), text_item))
                        else:
                            text_candidates.append((float('inf'), text_content.strip(), text_item))
                    
                    # Sort by distance (closest first)
                    text_candidates.sort(key=lambda x: x[0])
                
                # Search through candidates for tolerance values
                for distance, text_content, text_item in text_candidates:
                    # Look for small decimal numbers (common GDT tolerance format: 0.003, 0.005, etc.)
                    patterns = [
                        r'\b(0\.\d{2,4})\b',  # 0.003, 0.005, 0.025
                        r'\b(0\.0\d{1,3})\b',  # 0.003, 0.005
                        r'^(\d+\.?\d*)$',      # Simple number like "0.003"
                    ]
                    
                    for pattern in patterns:
                        number_match = re.search(pattern, text_content)
                        if number_match:
                            try:
                                extracted_value = float(number_match.group(1))
                                # GDT tolerances are typically small positive numbers (0.001 to 0.999)
                                if 0 < extracted_value < 1:
                                    tolerance_value = number_match.group(1)
                                    tolerance_text = text_content.strip()
                                    associated_text_item = text_item
                                    logger.info(f"✓ Fallback: Found tolerance '{tolerance_value}' in text '{text_content}' for GDT '{gdt_symbol}' (distance: {distance:.1f})")
                                    break
                            except ValueError:
                                pass
                    
                    if tolerance_value:
                        # Mark associated text as used by GDT
                        if associated_text_item:
                            text_content = associated_text_item.get('text', '') or associated_text_item.get('content', '')
                            if text_content:
                                gdt_associated_texts.add(text_content.strip())
                        break
            
            # Create dimension entry for GDT symbol
            nominal = tolerance_value if tolerance_value else gdt_symbol
            upper_tol = diameter_upper_tol if (is_diameter_gdt and diameter_nominal is not None) else ''
            lower_tol = diameter_lower_tol if (is_diameter_gdt and diameter_nominal is not None) else ''
            
            # Merge GDT symbol bbox with associated text bbox to include the tolerance value
            # This ensures the combined bbox covers both the symbol AND the nominal value
            combined_bbox = gdt_box
            if associated_text_item and gdt_box:
                text_box = associated_text_item.get('box', [])
                if text_box and len(text_box) >= 2 and len(gdt_box) >= 2:
                    # Get all x and y coordinates from both boxes
                    all_x_coords = [p[0] for p in gdt_box] + [p[0] for p in text_box]
                    all_y_coords = [p[1] for p in gdt_box] + [p[1] for p in text_box]
                    
                    # Calculate combined bounding box (min/max of both)
                    min_x = min(all_x_coords)
                    max_x = max(all_x_coords)
                    min_y = min(all_y_coords)
                    max_y = max(all_y_coords)
                    
                    # Create combined bbox in standard format: [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
                    combined_bbox = [
                        [min_x, min_y],  # top-left
                        [max_x, min_y],  # top-right
                        [max_x, max_y],  # bottom-right
                        [min_x, max_y]   # bottom-left
                    ]
                    logger.debug(f"Combined GDT bbox: symbol + text -> {combined_bbox}")
            
            dimension_type_for_gdt = "Diameter" if is_diameter_gdt else f"GDT-{gdt_symbol}"

            gdt_dimension = {
                'text': tolerance_text or gdt_symbol,
                'nominal_value': nominal,
                'upper_tolerance': upper_tol,
                'lower_tolerance': lower_tol,
                'dimension_type': dimension_type_for_gdt,
                'bbox': combined_bbox,
                'gdt_confidence': gdt_confidence,
                'gdt_class': gdt_item.get('class', 0)
            }
            gdt_dimension_results.append(gdt_dimension)
            logger.info(f"✓ Created GDT dimension: type={gdt_dimension['dimension_type']}, nominal={nominal}, tolerance={tolerance_value or 'N/A'}")
        
        # Deduplicate GDT dimensions: when multiple symbols refer to same callout,
        # keep only the one with highest detection confidence
        if len(gdt_dimension_results) > 1:
            deduped_gdt = []
            used = [False] * len(gdt_dimension_results)
            
            for i, dim_i in enumerate(gdt_dimension_results):
                if used[i]:
                    continue
                group_indices = [i]
                nom_i = str(dim_i.get('nominal_value', '')).strip()
                
                # Group all GDT dimensions that share the same nominal value
                for j in range(i + 1, len(gdt_dimension_results)):
                    if used[j]:
                        continue
                    dim_j = gdt_dimension_results[j]
                    nom_j = str(dim_j.get('nominal_value', '')).strip()
                    if nom_i != '' and nom_i == nom_j:
                        group_indices.append(j)
                        used[j] = True
                
                # From this group, keep the dimension with highest confidence
                best_idx = max(
                    group_indices,
                    key=lambda idx: float(gdt_dimension_results[idx].get('gdt_confidence', 0.0))
                )
                deduped_gdt.append(gdt_dimension_results[best_idx])
            
            if len(deduped_gdt) != len(gdt_dimension_results):
                logger.info(
                    f"Deduplicated GDT dimensions: {len(gdt_dimension_results)} -> {len(deduped_gdt)} "
                    f"(kept highest-confidence symbol per callout)"
                )
            gdt_dimension_results = deduped_gdt
        
        # Filter out text-based dimensions that are duplicates of GDT dimensions
        filtered_dimension_results = []
        gdt_nominal_values = {dim['nominal_value'] for dim in gdt_dimension_results if dim.get('nominal_value')}
        
        for dim in dimension_results:
            dim_nominal = dim.get('nominal_value', '')
            dim_text = dim.get('text', '')
            
            # Check if this dimension is associated with a GDT symbol
            is_gdt_associated = dim_text.strip() in gdt_associated_texts
            
            # Check if nominal value matches a GDT dimension
            is_duplicate = False
            if dim_nominal:
                # Exact match
                if dim_nominal in gdt_nominal_values:
                    is_duplicate = True
                else:
                    # Try numeric comparison
                    try:
                        dim_numeric = float(str(dim_nominal).replace(',', '.'))
                        for gdt_nominal in gdt_nominal_values:
                            try:
                                gdt_numeric = float(str(gdt_nominal).replace(',', '.'))
                                if abs(dim_numeric - gdt_numeric) < 0.0001:
                                    is_duplicate = True
                                    break
                            except (ValueError, TypeError):
                                pass
                    except (ValueError, TypeError):
                        pass
            
            # Exclude if it's associated with GDT or is a duplicate
            if is_gdt_associated or is_duplicate:
                logger.debug(f"Excluding text dimension '{dim_text}' (nominal: {dim_nominal}) - covered by GDT dimension")
                continue
            
            filtered_dimension_results.append(dim)
        
        logger.info(f"Filtered dimensions: {len(dimension_results)} -> {len(filtered_dimension_results)} (removed {len(dimension_results) - len(filtered_dimension_results)} duplicates)")
        
        # Combine filtered text-based dimensions and GDT-based dimensions
        # Prioritize GDT dimensions by putting them first
        all_dimension_results = gdt_dimension_results + filtered_dimension_results
        
        logger.info(f"✓ Total dimensions: {len(all_dimension_results)} ({len(filtered_dimension_results)} from text, {len(gdt_dimension_results)} from GDT)")
        
        return {
            "success": True,
            "dimensions": all_dimension_results,
            "count": len(all_dimension_results),
            "text_dimensions": len(filtered_dimension_results),
            "gdt_dimensions": len(gdt_dimension_results)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing dimensions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing dimensions: {str(e)}")


@router.get("/bounding-boxes/part/{part_id}")
async def get_bounding_boxes_by_part(part_id: int, db: Session = Depends(get_db)):
    """Get all balloons (bounding boxes) for a part."""
    # Validate part exists
    from app.models.part import Part
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part with ID {part_id} not found"
        )
    
    # Get all balloons for this part using raw SQL to avoid VARCHAR type mapping issues
    # Cast VARCHAR columns to TEXT to match SQLAlchemy expectations
    # Order by creation time to preserve existing balloon order (balloons 1-5 stay as 1-5)
    # New balloons are added at the end, maintaining stable numbering
    query = text("""
        SELECT 
            id, part_id, document_id, balloon_id,
            x, y, width, height, page,
            nominal,
            utol::TEXT as utol,
            ltol::TEXT as ltol,
            type::TEXT as type,
            zone::TEXT as zone,
            measuring_instrument::TEXT as measuring_instrument,
            op_no::TEXT as op_no,
            created_at, updated_at
        FROM balloons
        WHERE part_id = :part_id
        ORDER BY created_at ASC
    """)
    result = db.execute(query, {"part_id": part_id})
    rows = result.fetchall()
    
    # Convert to bounding box format
    # NOTE:
    # - "id" is the external balloon identifier (balloon_id column) used by the frontend
    # - "balloon_db_id" exposes the internal numeric primary key so other APIs
    #   (like /measurements) that reference balloons by integer ID can be used
    bounding_boxes = []
    for row in rows:
        bbox_data = {
            "id": row.balloon_id,
            "balloon_db_id": row.id,
            "x": row.x,
            "y": row.y,
            "width": row.width,
            "height": row.height,
            "page": row.page or 1,
            "label": row.type or "",
            "zone": row.zone,
            "nominal": row.nominal,
            "utol": row.utol,
            "ltol": row.ltol,
            "type": row.type,
            "measuring_instrument": row.measuring_instrument,
            "op_no": row.op_no,
            "part_id": row.part_id,
            "document_id": row.document_id
        }
        bounding_boxes.append(bbox_data)
    
    return {"bounding_boxes": bounding_boxes}


@router.get("/bounding-boxes/document/{document_id}")
async def get_bounding_boxes_by_document(document_id: int, db: Session = Depends(get_db)):
    """Get all balloons (bounding boxes) for a document (optional filter)."""
    # Get all balloons for this document using raw SQL to avoid VARCHAR type mapping issues
    # Cast VARCHAR columns to TEXT to match SQLAlchemy expectations
    # Order by creation time to preserve existing balloon order (balloons 1-5 stay as 1-5)
    # New balloons are added at the end, maintaining stable numbering
    query = text("""
        SELECT 
            id, part_id, document_id, balloon_id,
            x, y, width, height, page,
            nominal,
            utol::TEXT as utol,
            ltol::TEXT as ltol,
            type::TEXT as type,
            zone::TEXT as zone,
            measuring_instrument::TEXT as measuring_instrument,
            op_no::TEXT as op_no,
            created_at, updated_at
        FROM balloons
        WHERE document_id = :document_id
        ORDER BY created_at ASC
    """)
    result = db.execute(query, {"document_id": document_id})
    rows = result.fetchall()
    
    # Convert to bounding box format
    bounding_boxes = []
    for row in rows:
        bbox_data = {
            "id": row.balloon_id,
            "balloon_db_id": row.id,
            "x": row.x,
            "y": row.y,
            "width": row.width,
            "height": row.height,
            "page": row.page or 1,
            "label": row.type or "",
            "zone": row.zone,
            "nominal": row.nominal,
            "utol": row.utol,
            "ltol": row.ltol,
            "type": row.type,
            "measuring_instrument": row.measuring_instrument,
            "op_no": row.op_no,
            "part_id": row.part_id,
            "document_id": row.document_id
        }
        bounding_boxes.append(bbox_data)
    
    return {"bounding_boxes": bounding_boxes}


@router.post("/bounding-box")
async def save_bounding_box(request: SaveBoundingBoxRequest, db: Session = Depends(get_db)):
    """Save a bounding box (balloon) to the database."""
    from app.models.part import Part
    import time
    
    # Validate part exists
    part = db.query(Part).filter(Part.id == request.part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part with ID {request.part_id} not found"
        )
    
    # Validate document if provided
    document_id = None
    if request.pdf_id:
        try:
            document_id = int(request.pdf_id)
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with ID {document_id} not found"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pdf_id must be a valid document ID (integer)"
            )
    
    # Generate unique balloon_id
    balloon_id = str(int(time.time() * 1000000))
    
    # Detect zone for this bounding box
    zone_label = None
    if ZoneDetector and document_id:
        try:
            # Get PDF path from document
            file_path = get_pdf_path_from_document(document_id, db)
            if file_path and Path(file_path).exists():
                # Convert page number to 0-indexed (PyMuPDF uses 0-indexed pages)
                page_number = request.bounding_box.page - 1
                region = {
                    'x': request.bounding_box.x,
                    'y': request.bounding_box.y,
                    'width': request.bounding_box.width,
                    'height': request.bounding_box.height
                }
                zone_results = ZoneDetector.extract_zone_from_region(
                    pdf_path=str(file_path),
                    page_number=page_number,
                    region=region,
                    scale_factor=1.0
                )
                if zone_results and len(zone_results) > 0:
                    zone_label = zone_results[0].get('zone')
                    logger.info(f"Detected zone: {zone_label} for bounding box")
        except Exception as e:
            logger.warning(f"Could not detect zone for bounding box: {str(e)}")
    
    # Insert balloon using raw SQL to avoid VARCHAR type mapping issues
    insert_query = text("""
        INSERT INTO balloons (part_id, document_id, balloon_id, x, y, width, height, page, type, zone)
        VALUES (:part_id, :document_id, :balloon_id, :x, :y, :width, :height, :page, :type, :zone)
        RETURNING id
    """)
    result = db.execute(insert_query, {
        "part_id": request.part_id,
        "document_id": document_id,
        "balloon_id": balloon_id,
        "x": request.bounding_box.x,
        "y": request.bounding_box.y,
        "width": request.bounding_box.width,
        "height": request.bounding_box.height,
        "page": request.bounding_box.page,
        "type": request.label,
        "zone": zone_label
    })
    
    # Get the inserted ID BEFORE committing (cursor closes after commit)
    inserted_id = result.fetchone().id
    db.commit()
    
    return {
        "message": "Bounding box saved successfully",
        "id": balloon_id,
        "balloon": {
            "id": inserted_id,
            "balloon_id": balloon_id,
            "part_id": request.part_id,
            "document_id": document_id,
            "zone": zone_label
        }
    }


@router.put("/bounding-box/part/{part_id}/{balloon_id}")
async def update_bounding_box(
    part_id: int,
    balloon_id: str,
    request: UpdateBoundingBoxRequest,
    db: Session = Depends(get_db)
):
    """Update a balloon with extracted data."""
    # Find balloon by balloon_id and part_id using raw SQL to avoid VARCHAR type mapping issues
    query = text("""
        SELECT id, part_id, document_id, balloon_id,
               x, y, width, height, page,
               nominal,
               utol::TEXT as utol,
               ltol::TEXT as ltol,
               type::TEXT as type,
               zone::TEXT as zone,
               measuring_instrument::TEXT as measuring_instrument,
               op_no::TEXT as op_no
        FROM balloons
        WHERE part_id = :part_id AND balloon_id = :balloon_id
        LIMIT 1
    """)
    result = db.execute(query, {"part_id": part_id, "balloon_id": balloon_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Balloon {balloon_id} not found for part {part_id}"
        )
    
    # Update balloon with dimension data if provided using raw SQL
    update_fields = []
    update_params = {"balloon_id": row.id}
    
    if request.dimension_data and len(request.dimension_data) > 0:
        dim = request.dimension_data[0]
        if "nominal_value" in dim:
            update_fields.append("nominal = :nominal")
            update_params["nominal"] = float(dim["nominal_value"]) if dim["nominal_value"] else None
        if "upper_tolerance" in dim:
            update_fields.append("utol = :utol")
            update_params["utol"] = dim["upper_tolerance"]
        if "lower_tolerance" in dim:
            update_fields.append("ltol = :ltol")
            update_params["ltol"] = dim["lower_tolerance"]
        if "dimension_type" in dim:
            update_fields.append("type = :type")
            update_params["type"] = dim["dimension_type"]
    
    if update_fields:
        update_query = text(f"""
            UPDATE balloons
            SET {', '.join(update_fields)}
            WHERE id = :balloon_id
        """)
        db.execute(update_query, update_params)
        db.commit()
    
    # Fetch updated values using raw SQL
    fetch_query = text("""
        SELECT id, balloon_id, nominal,
               utol::TEXT as utol,
               ltol::TEXT as ltol,
               type::TEXT as type
        FROM balloons
        WHERE id = :balloon_id
    """)
    result = db.execute(fetch_query, {"balloon_id": row.id})
    updated_row = result.fetchone()
    
    return {
        "message": "Balloon updated successfully",
        "balloon": {
            "id": updated_row.id,
            "balloon_id": updated_row.balloon_id,
            "nominal": updated_row.nominal,
            "utol": updated_row.utol,
            "ltol": updated_row.ltol,
            "type": updated_row.type
        }
    }


@router.delete("/bounding-box/part/{part_id}/{balloon_id}")
async def delete_bounding_box(part_id: int, balloon_id: str, db: Session = Depends(get_db)):
    """Delete a balloon."""
    # Check if balloon exists using raw SQL to avoid VARCHAR type mapping issues
    check_query = text("""
        SELECT id FROM balloons
        WHERE part_id = :part_id AND balloon_id = :balloon_id
        LIMIT 1
    """)
    result = db.execute(check_query, {"part_id": part_id, "balloon_id": balloon_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Balloon {balloon_id} not found for part {part_id}"
        )
    
    # Delete using raw SQL
    delete_query = text("""
        DELETE FROM balloons
        WHERE id = :balloon_id
    """)
    db.execute(delete_query, {"balloon_id": row.id})
    db.commit()
    
    return {"message": "Balloon deleted successfully"}

