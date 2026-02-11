import React, { useState, useEffect } from 'react';
import { FileText as ReportIcon, Download, FilePlus, Upload, ChevronLeft, ChevronRight, Palette, Table, Settings } from 'lucide-react';
import useReportStore from '../store/report';
import jsPDF from 'jspdf';

const Report = ({ 
  partData, partId, bomData, logo, setLogo, customFields, 
  showReportModal, setShowReportModal,
  showCustomFieldsModal, setShowCustomFieldsModal,
  showLogoModal, setShowLogoModal,
  showStatus
}) => {

  // State for table data management
  const [tableData, setTableData] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([
    'Nominal', 'Tolerance', 'Type', 'M1', 'M2', 'M3', 'Mean', 'Status'
  ]);

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    row: null,
    col: null
  });

  const handleContextMenu = (e, rowIndex, colIndex) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      row: rowIndex,
      col: colIndex
    });
  };

  const closeContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      row: null,
      col: null
    });
  };

  const [customHeaders, setCustomHeaders] = useState([]);
  const [showCustomHeadersModal, setShowCustomHeadersModal] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [showThemesModal, setShowThemesModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        closeContextMenu();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

  const reportThemes = {
    default: {
      name: 'Default Theme',
      headerBg: '#ffffff',
      headerBorder: '#000000',
      titleColor: '#000000',
      subtitleColor: '#4b5563',
      sectionBg: '#ffffff',
      sectionBorder: '#e5e7eb',
      tableHeaderBg: '#f9fafb',
      tableHeaderColor: '#374151',
      tableBorder: '#e5e7eb',
      footerBg: '#f9fafb',
      footerColor: '#6b7280'
    },
    blue: {
      name: 'Blue Professional',
      headerBg: '#1e40af',
      headerBorder: '#1e40af',
      titleColor: '#ffffff',
      subtitleColor: '#dbeafe',
      sectionBg: '#ffffff',
      sectionBorder: '#3b82f6',
      tableHeaderBg: '#eff6ff',
      tableHeaderColor: '#1e40af',
      tableBorder: '#3b82f6',
      footerBg: '#f0f9ff',
      footerColor: '#1e40af'
    },
    green: {
      name: 'Green Corporate',
      headerBg: '#166534',
      headerBorder: '#166534',
      titleColor: '#ffffff',
      subtitleColor: '#dcfce7',
      sectionBg: '#ffffff',
      sectionBorder: '#22c55e',
      tableHeaderBg: '#f0fdf4',
      tableHeaderColor: '#166534',
      tableBorder: '#22c55e',
      footerBg: '#f0fdf4',
      footerColor: '#166534'
    },
    purple: {
      name: 'Purple Modern',
      headerBg: '#6b21a8',
      headerBorder: '#6b21a8',
      titleColor: '#ffffff',
      subtitleColor: '#f3e8ff',
      sectionBg: '#ffffff',
      sectionBorder: '#a855f7',
      tableHeaderBg: '#faf5ff',
      tableHeaderColor: '#6b21a8',
      tableBorder: '#a855f7',
      footerBg: '#faf5ff',
      footerColor: '#6b21a8'
    },
    minimal: {
      name: 'Minimal Light',
      headerBg: '#fafafa',
      headerBorder: '#d1d5db',
      titleColor: '#374151',
      subtitleColor: '#6b7280',
      sectionBg: '#ffffff',
      sectionBorder: '#e5e7eb',
      tableHeaderBg: '#f9fafb',
      tableHeaderColor: '#374151',
      tableBorder: '#e5e7eb',
      footerBg: '#f9fafb',
      footerColor: '#9ca3af'
    }
  };

  const ThemesModal = () => {
    if (!showThemesModal) return null;
    
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1003,
          padding: '1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowThemesModal(false);
          }
        }}
      >
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          width: '500px',
          maxWidth: '95vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#111827' 
          }}>
            Choose Report Theme
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Select Theme
            </label>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {Object.entries(reportThemes).map(([key, theme]) => (
                <div
                  key={key}
                  onClick={() => setSelectedTheme(key)}
                  style={{
                    padding: '1rem',
                    border: selectedTheme === key ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    backgroundColor: selectedTheme === key ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (selectedTheme !== key) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedTheme !== key) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '4px',
                      backgroundColor: theme.headerBg,
                      border: `2px solid ${theme.headerBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: theme.titleColor,
                        borderRadius: '2px'
                      }}></div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '0.25rem'
                      }}>
                        {theme.name}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        Professional {key} theme for reports
                      </div>
                    </div>
                    {selectedTheme === key && (
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff'
                        }}></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowThemesModal(false)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => setShowThemesModal(false)}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Apply Theme
            </button>
          </div>
        </div>
      </div>
    );
  };

  const { reportData, loading: reportLoading, error: reportError, fetchPartReport } = useReportStore();
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0, isDragging: false });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize table data from reportData
  useEffect(() => {
    if (reportData?.quantity_reports && reportData.quantity_reports.length > 0) {
      const selectedReport = reportData.quantity_reports.find(
        qr => qr.quantity.toString() === selectedQuantity
      ) || reportData.quantity_reports[0];

      if (selectedReport?.balloons) {
        const formattedData = selectedReport.balloons.map(balloonItem => ({
          nominal: balloonItem.balloon?.nominal || 'N/A',
          tolerance: balloonItem.balloon?.utol && balloonItem.balloon?.ltol 
            ? `${balloonItem.balloon.ltol} / ${balloonItem.balloon.utol}` 
            : 'N/A',
          type: balloonItem.balloon?.type || 'N/A',
          m1: balloonItem.measurements?.[0]?.m1 || 'N/A',
          m2: balloonItem.measurements?.[0]?.m2 || 'N/A',
          m3: balloonItem.measurements?.[0]?.m3 || 'N/A',
          mean: balloonItem.measurements?.[0]?.mean || 'N/A',
          status: balloonItem.measurements?.[0]?.go_or_no_go || 'N/A'
        }));
        setTableData(formattedData);
      }
    }
  }, [reportData, selectedQuantity]);

  const handleLogoMouseDown = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - logoPosition.x,
      y: e.clientY - rect.top - logoPosition.y
    });
    setLogoPosition(prev => ({ ...prev, isDragging: true }));
  };

  const handleMouseMove = (e) => {
    if (!logoPosition.isDragging) return;
    
    const headerRect = e.currentTarget.getBoundingClientRect();
    const newX = e.clientX - headerRect.left - dragStart.x;
    const newY = e.clientY - headerRect.top - dragStart.y;
    
    const maxX = headerRect.width - 120;
    const maxY = headerRect.height - 60;
    
    setLogoPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
      isDragging: true
    });
  };

  const handleMouseUp = () => {
    if (logoPosition.isDragging) {
      setLogoPosition(prev => ({ ...prev, isDragging: false }));
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (logoPosition.isDragging) {
        const headerElement = document.getElementById('report-header');
        if (headerElement) {
          const headerRect = headerElement.getBoundingClientRect();
          const newX = e.clientX - headerRect.left - dragStart.x;
          const newY = e.clientY - headerRect.top - dragStart.y;
          
          const maxX = headerRect.width - 120;
          const maxY = headerRect.height - 60;
          
          setLogoPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
            isDragging: true
          });
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (logoPosition.isDragging) {
        setLogoPosition(prev => ({ ...prev, isDragging: false }));
      }
    };

    if (logoPosition.isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [logoPosition.isDragging, dragStart]);

  useEffect(() => {
    if (reportData?.quantity_reports && reportData.quantity_reports.length > 0 && !selectedQuantity) {
      setSelectedQuantity(reportData.quantity_reports[0].quantity.toString());
    }
  }, [reportData, selectedQuantity]);

  useEffect(() => {
    if (showReportModal && partId) {
      fetchPartReport(partId).catch(err => {
        console.error('Failed to fetch report data:', err);
        showStatus('Failed to load report data', 'error');
      });
    }
  }, [showReportModal, partId, fetchPartReport, showStatus]);

  const generatePDF = async () => {
    try {
      showStatus('Generating PDF...', 'info');
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      const checkPageBreak = (requiredHeight) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      if (logo) {
        try {
          pdf.addImage(logo, 'PNG', pageWidth - 45, yPosition, 30, 15);
        } catch (error) {
          console.warn('Could not add logo to PDF:', error);
        }
      }

      checkPageBreak(20);
      pdf.setFontSize(24);
      pdf.setFont(undefined, 'bold');
      const titleWidth = pdf.getTextWidth('Inspection Report');
      pdf.text('Inspection Report', (pageWidth - titleWidth) / 2, yPosition + 10);
      yPosition += 15;

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      if (customFields.length > 0) {
        checkPageBreak(15);
        yPosition += 5;
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Custom Fields', margin, yPosition);
        yPosition += 10;
        
        const cfColumnWidths = [50, 50];
        const cfRowHeight = 8;
        const cfStartX = margin;
        const cfStartY = yPosition;
        
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8);
        
        customFields.forEach((field, index) => {
          checkPageBreak(cfRowHeight + 2);
          let cfXPos = cfStartX;
          
          const cfRow = [field.name || '', field.value || 'Not set'];
          
          cfRow.forEach((cell, cellIndex) => {
            if (index % 2 === 0) {
              pdf.setFillColor(245, 245, 245);
            } else {
              pdf.setFillColor(255, 255, 255);
            }
            
            pdf.rect(cfXPos, yPosition, cfColumnWidths[cellIndex], cfRowHeight, 'F');
            pdf.setDrawColor(0, 0, 0);
            pdf.rect(cfXPos, yPosition, cfColumnWidths[cellIndex], cfRowHeight);
            
            let displayText = cell.toString();
            if (displayText.length > 12) {
              displayText = displayText.substring(0, 10) + '...';
            }
            
            pdf.text(displayText, cfXPos + 2, yPosition + 5);
            cfXPos += cfColumnWidths[cellIndex];
          });
          
          yPosition += cfRowHeight;
        });
        
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(cfStartX, cfStartY, 100, customFields.length * cfRowHeight);
        yPosition += 8;
      }

      if (customHeaders.length > 0) {
        checkPageBreak(15);
        yPosition += 5;
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Custom Headers', margin, yPosition);
        yPosition += 10;
        
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8);
        
        customHeaders.forEach((header, index) => {
          checkPageBreak(8 + 2);
          pdf.text(`${header.name}: ${header.value}`, margin, yPosition + 5);
          yPosition += 8;
        });
        yPosition += 8;
      }

      if (tableData.length > 0) {
        checkPageBreak(20);
        yPosition += 10;
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Inspection Data', margin, yPosition);
        yPosition += 20;
        
        const columnWidths = [20, 25, 20, 15, 15, 15, 15, 15];
        const startX = margin;
        const rowHeight = 8;
        const startY = yPosition;
        
        pdf.setFontSize(7);
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(52, 73, 94);
        pdf.setTextColor(255, 255, 255);
        
        let xPos = startX;
        tableHeaders.forEach((header, index) => {
          pdf.rect(xPos, yPosition, columnWidths[index], rowHeight, 'F');
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(xPos, yPosition, columnWidths[index], rowHeight);
          const textWidth = pdf.getTextWidth(header);
          pdf.text(header, xPos + (columnWidths[index] - textWidth) / 2, yPosition + 5);
          xPos += columnWidths[index];
        });
        
        yPosition += rowHeight;
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        
        tableData.forEach((row, index) => {
          checkPageBreak(rowHeight + 2);
          xPos = startX;
          
          const rowValues = [row.nominal, row.tolerance, row.type, row.m1, row.m2, row.m3, row.mean, row.status];
          
          rowValues.forEach((cell, cellIndex) => {
            if (index % 2 === 0) {
              pdf.setFillColor(245, 245, 245);
            } else {
              pdf.setFillColor(255, 255, 255);
            }
            
            pdf.rect(xPos, yPosition, columnWidths[cellIndex], rowHeight, 'F');
            pdf.setDrawColor(0, 0, 0);
            pdf.rect(xPos, yPosition, columnWidths[cellIndex], rowHeight);
            
            let displayText = cell.toString();
            if (displayText.length > 10) {
              displayText = displayText.substring(0, 8) + '...';
            }
            
            pdf.text(displayText, xPos + 1, yPosition + 5);
            xPos += columnWidths[cellIndex];
          });
          
          yPosition += rowHeight;
        });
      }

      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
      }
      
      const fileName = `Inspection_Report_${partData.name || 'Direct_Part'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      showStatus('PDF downloaded successfully!', 'success');
      setShowReportModal(false);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      showStatus('Error generating PDF: ' + error.message, 'error');
    }
  };

  const CustomHeadersModal = () => {
    if (!showCustomHeadersModal) return null;
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowCustomHeadersModal(false);
          }
        }}
      >
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          width: '500px',
          maxWidth: '95vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#111827' 
          }}>
            Create Custom Headers
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Header Name
            </label>
            <input
              type="text"
              id="newHeaderName"
              placeholder="Enter header name"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Header Value
            </label>
            <input
              type="text"
              id="newHeaderValue"
              placeholder="Enter header value"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {customHeaders.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Current Headers:
              </h4>
              <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                {customHeaders.map((header, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>
                        {header.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#111827' }}>
                        {header.value}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCustomHeaders(customHeaders.filter((_, i) => i !== index));
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #ef4444',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCustomHeadersModal(false)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const nameInput = document.getElementById('newHeaderName');
                const valueInput = document.getElementById('newHeaderValue');
                
                if (nameInput.value.trim() && valueInput.value.trim()) {
                  setCustomHeaders([...customHeaders, { 
                    name: nameInput.value.trim(), 
                    value: valueInput.value.trim() 
                  }]);
                  nameInput.value = '';
                  valueInput.value = '';
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Add Header
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ContextMenu = () => {
    if (!contextMenu.visible) return null;

    const menuItems = [
      { label: 'Add Column Before', action: 'addColumnBefore', divider: false },
      { label: 'Add Column After', action: 'addColumnAfter', divider: true },
      { label: 'Delete Column Before', action: 'deleteColumnBefore', divider: false },
      { label: 'Delete Column After', action: 'deleteColumnAfter', divider: false },
      { label: 'Delete Column', action: 'deleteColumn', divider: true },
      { label: 'Add Row Before', action: 'addRowBefore', divider: false },
      { label: 'Add Row After', action: 'addRowAfter', divider: true },
      { label: 'Delete Row Before', action: 'deleteRowBefore', divider: false },
      { label: 'Delete Row After', action: 'deleteRowAfter', divider: false },
      { label: 'Delete Row', action: 'deleteRow', divider: true },
      { label: 'Import Data', action: 'importData', divider: false },
      { label: 'Change column name', action: 'changeColumnName', divider: true },
      { label: 'Go', action: 'setGo', divider: false },
      { label: 'No-Go', action: 'setNoGo', divider: false },
      { label: 'Remove Go/No-Go', action: 'removeGoNoGo', divider: false }
    ];

    const handleMenuClick = (action) => {
      const { row, col } = contextMenu;
      
   switch (action) {
  case 'addColumnBefore':
    // Add new column at the end
    const beforeHeader = `Column ${tableHeaders.length + 1}`;
    const beforeHeaders = [...tableHeaders, beforeHeader];
    setTableHeaders(beforeHeaders);
    
    // Add new column data to all rows
    const beforeData = tableData.map(rowData => {
      const keys = ['nominal', 'tolerance', 'type', 'm1', 'm2', 'm3', 'mean', 'status'];
      const newRowData = { ...rowData };
      
      // Add the new column with 'N/A' value
      const newColumnIndex = beforeHeaders.length - 1;
      if (newColumnIndex < keys.length) {
        newRowData[keys[newColumnIndex]] = 'N/A';
      } else {
        newRowData[`col_${newColumnIndex}`] = 'N/A';
      }
      
      return newRowData;
    });
    
    setTableData(beforeData);
    showStatus('New column added at the end', 'success');
    break;
    
  case 'addColumnAfter':
    // Add new column at the end
    const afterHeader = `Column ${tableHeaders.length + 1}`;
    const afterHeaders = [...tableHeaders, afterHeader];
    setTableHeaders(afterHeaders);
    
    // Add new column data to all rows
    const afterData = tableData.map(rowData => {
      const keys = ['nominal', 'tolerance', 'type', 'm1', 'm2', 'm3', 'mean', 'status'];
      const newRowData = { ...rowData };
      
      // Add the new column with 'N/A' value
      const newColumnIndex = afterHeaders.length - 1;
      if (newColumnIndex < keys.length) {
        newRowData[keys[newColumnIndex]] = 'N/A';
      } else {
        newRowData[`col_${newColumnIndex}`] = 'N/A';
      }
      
      return newRowData;
    });
    
    setTableData(afterData);
    showStatus('New column added at the end', 'success');
    break;
    
    setTableData(newData);
    showStatus('New column added at the end', 'success');
    break;
          
        case 'deleteColumnBefore':
          if (col !== null && col > 0) {
            const newHeaders = tableHeaders.filter((_, index) => index !== col - 1);
            setTableHeaders(newHeaders);
            
            const newData = tableData.map(rowData => {
              const values = Object.values(rowData);
              values.splice(col - 1, 1);
              return {
                nominal: values[0] || 'N/A',
                tolerance: values[1] || 'N/A',
                type: values[2] || 'N/A',
                m1: values[3] || 'N/A',
                m2: values[4] || 'N/A',
                m3: values[5] || 'N/A',
                mean: values[6] || 'N/A',
                status: values[7] || 'N/A'
              };
            });
            setTableData(newData);
            showStatus('Column before deleted', 'success');
          }
          break;
          
        case 'deleteColumnAfter':
          if (col !== null && col < tableHeaders.length - 1) {
            const newHeaders = tableHeaders.filter((_, index) => index !== col + 1);
            setTableHeaders(newHeaders);
            
            const newData = tableData.map(rowData => {
              const values = Object.values(rowData);
              values.splice(col + 1, 1);
              return {
                nominal: values[0] || 'N/A',
                tolerance: values[1] || 'N/A',
                type: values[2] || 'N/A',
                m1: values[3] || 'N/A',
                m2: values[4] || 'N/A',
                m3: values[5] || 'N/A',
                mean: values[6] || 'N/A',
                status: values[7] || 'N/A'
              };
            });
            setTableData(newData);
            showStatus('Column after deleted', 'success');
          }
          break;
          
        case 'deleteColumn':
          if (col !== null) {
            const newHeaders = tableHeaders.filter((_, index) => index !== col);
            setTableHeaders(newHeaders);
            
            const newData = tableData.map(rowData => {
              const values = Object.values(rowData);
              values.splice(col, 1);
              return {
                nominal: values[0] || 'N/A',
                tolerance: values[1] || 'N/A',
                type: values[2] || 'N/A',
                m1: values[3] || 'N/A',
                m2: values[4] || 'N/A',
                m3: values[5] || 'N/A',
                mean: values[6] || 'N/A',
                status: values[7] || 'N/A'
              };
            });
            setTableData(newData);
            showStatus('Column deleted', 'success');
          }
          break;
          
        case 'addRowBefore':
          if (row !== null) {
            // Create new row with values for all existing columns
            const newRow = {};
            const keys = ['nominal', 'tolerance', 'type', 'm1', 'm2', 'm3', 'mean', 'status'];
            
            // Add values for each column based on headers
            tableHeaders.forEach((header, idx) => {
              if (idx < keys.length) {
                newRow[keys[idx]] = 'N/A';
              } else {
                newRow[`col_${idx}`] = 'N/A';
              }
            });
            
            const newData = [...tableData];
            newData.splice(row, 0, newRow);
            setTableData(newData);
            showStatus('Row added before row ' + (row + 1), 'success');
          }
          break;
          
        case 'addRowAfter':
          if (row !== null) {
            // Create new row with values for all existing columns
           const newRow = {};
  const keys = ['nominal', 'tolerance', 'type', 'm1', 'm2', 'm3', 'mean', 'status'];
  
            
            // Add values for each column based on headers
           tableHeaders.forEach((header, idx) => {
    if (idx < keys.length) {
      newRow[keys[idx]] = 'N/A';
    } else {
      newRow[`col_${idx}`] = 'N/A';
    }
  });
            
            const newData = [...tableData, newRow];
  setTableData(newData);
  showStatus('New row added at the end of table', 'success');
  break;
          }
          break;
          
        case 'deleteRowBefore':
          if (row !== null && row > 0) {
            const newData = tableData.filter((_, index) => index !== row - 1);
            setTableData(newData);
            showStatus('Row before deleted', 'success');
          }
          break;
          
        case 'deleteRowAfter':
          if (row !== null && row < tableData.length - 1) {
            const newData = tableData.filter((_, index) => index !== row + 1);
            setTableData(newData);
            showStatus('Row after deleted', 'success');
          }
          break;
          
        case 'deleteRow':
          if (row !== null) {
            const newData = tableData.filter((_, index) => index !== row);
            setTableData(newData);
            showStatus('Row deleted', 'success');
          }
          break;
          
        case 'importData':
          showStatus('Import data functionality - coming soon', 'info');
          break;
          
        case 'changeColumnName':
          if (col !== null) {
            const newName = prompt('Enter new column name:', tableHeaders[col]);
            if (newName && newName.trim()) {
              const newHeaders = [...tableHeaders];
              newHeaders[col] = newName.trim();
              setTableHeaders(newHeaders);
              showStatus('Column name changed', 'success');
            }
          }
          break;
          
        case 'setGo':
          if (row !== null) {
            const newData = [...tableData];
            newData[row].status = 'GO';
            setTableData(newData);
            showStatus('Status set to GO', 'success');
          }
          break;
          
        case 'setNoGo':
          if (row !== null) {
            const newData = [...tableData];
            newData[row].status = 'NO-GO';
            setTableData(newData);
            showStatus('Status set to NO-GO', 'success');
          }
          break;
          
        case 'removeGoNoGo':
          if (row !== null) {
            const newData = [...tableData];
            newData[row].status = 'N/A';
            setTableData(newData);
            showStatus('GO/NO-GO status removed', 'success');
          }
          break;
          
        default:
          console.log('Unknown action:', action);
      }
      
      closeContextMenu();
    };

    return (
      <div
        style={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          minWidth: '200px',
          maxHeight: '400px',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {menuItems.map((item, index) => (
          <React.Fragment key={index}>
            <div
              onClick={() => handleMenuClick(item.action)}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#374151',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              {item.label}
            </div>
            {item.divider && index < menuItems.length - 1 && (
              <div style={{ 
                height: '1px', 
                backgroundColor: '#e5e7eb', 
                margin: '0.25rem 0' 
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const LogoUploadModal = () => {
    if (!showLogoModal) return null;
    
    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          showStatus('Please upload an image file', 'error');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          showStatus('Image size should be less than 5MB', 'error');
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          if (typeof setLogo === 'function') {
            setLogo(e.target.result);
          } else {
            console.warn('setLogo function not available');
          }
          setShowLogoModal(false);
          showStatus('Logo uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1002,
          padding: '1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowLogoModal(false);
          }
        }}
      >
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          width: '400px',
          maxWidth: '95vw',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#111827' 
          }}>
            Upload Company Logo
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Select Logo Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280', 
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Requirements:</div>
            <div>• Image files only (PNG, JPG, JPEG, GIF)</div>
            <div>• Maximum file size: 5MB</div>
            <div>• Recommended size: 120x60px for best display</div>
          </div>
          
          {logo && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Current Logo:
              </h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#f9fafb',
                borderRadius: '4px',
                border: '1px solid #e5e7eb'
              }}>
                <img 
                  src={logo} 
                  alt="Current Logo" 
                  style={{ 
                    width: '60px', 
                    height: '30px',
                    objectFit: 'contain',
                    border: '1px solid #e5e7eb',
                    borderRadius: '2px'
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Logo uploaded
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setLogoPosition({ x: 0, y: 0, isDragging: false });
                setShowLogoModal(false);
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#f59e0b',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Reset Position
            </button>
            <button
              onClick={() => setShowLogoModal(false)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!showReportModal) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowReportModal(false);
        }
      }}
    >
      <div style={{
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        padding: '1.5rem',
        width: '1200px',
        maxWidth: '95vw',
        height: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        display: 'flex',
        gap: '1rem'
      }}>
        
        {/* LEFT SIDEBAR */}
        <div style={{
          width: sidebarCollapsed ? '60px' : '320px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          transition: 'width 0.3s ease',
          position: 'relative',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '2px solid #000000'
        }}>
          
          {/* Sidebar Header */}
          <div style={{
            borderBottom: '2px solid #000000',
            paddingBottom: '1rem',
            marginTop: '1rem'
          }}>
            {!sidebarCollapsed && (
              <h3 style={{
                color: '#000000',
                fontSize: '1.125rem',
                fontWeight: '700',
                margin: 0,
                textAlign: 'center',
                letterSpacing: '0.025em'
              }}>
                REPORT CONTROLS
              </h3>
            )}
          </div>

          {/* Sidebar Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            flex: 1
          }}>
            
            {/* Top Row: Custom Headers and Logo Upload - Side by Side */}
            {!sidebarCollapsed && (
              <div style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                <button
                  onClick={() => setShowCustomHeadersModal(true)}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                  }}
                  title="Custom Headers"
                >
                  <FilePlus size={16} />
                </button>

                <button
                  onClick={() => setShowLogoModal(true)}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                  }}
                  title={logo ? "Change Logo" : "Add Logo"}
                >
                  <Upload size={16} />
                </button>

                <button
                  onClick={() => {/* Add table functionality here */}}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                  }}
                  title="Table"
                >
                  <Table size={16} />
                </button>
              </div>
            )}

            {/* Collapsed view - stacked buttons */}
            {sidebarCollapsed && (
              <>
                <button
                  onClick={() => setShowCustomHeadersModal(true)}
                  style={{
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                  }}
                  title="Custom Headers"
                >
                  <FilePlus size={16} />
                </button>

                <button
                  onClick={() => setShowLogoModal(true)}
                  style={{
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                  }}
                  title={logo ? "Change Logo" : "Add Logo"}
                >
                  <Upload size={16} />
                </button>

                <button
                  onClick={() => {/* Add table functionality here */}}
                  style={{
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                  }}
                  title="Table"
                >
                  <Table size={16} />
                </button>
              </>
            )}

            {/* Quantity Selector */}
            {reportData?.quantity_reports && reportData.quantity_reports.length > 0 && !sidebarCollapsed && (
              <div style={{
                padding: '0.875rem',
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                border: '2px solid #000000'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: '#000000',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Select Quantity
                  </label>
                </div>
                <select
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #000000',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Quantities</option>
                  <option value="consolidate">Consolidate Report</option>
                  {reportData.quantity_reports.map((qtyReport, index) => (
                    <option key={index} value={qtyReport.quantity}>
                      Qty: {qtyReport.quantity}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                padding: '0.375rem 0.75rem',
                border: '2px solid #000000',
                borderRadius: '4px',
                backgroundColor: isEditing ? '#000000' : '#ffffff',
                color: isEditing ? '#ffffff' : '#000000',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (!isEditing) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }
              }}
              onMouseOut={(e) => {
                if (!isEditing) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }
              }}
            >
              {isEditing ? '✓ Editing Mode' : 'Edit Table'}
            </button>

            {/* Spacer to push bottom buttons down */}
            <div style={{ flex: 1 }}></div>

            {/* Bottom Row: Download PDF and Close - Side by Side */}
            {!sidebarCollapsed && (
              <div style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                <button
                  onClick={generatePDF}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    flexDirection: 'column',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#333333';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                  }}
                  title="Download PDF"
                >
                  <Download size={16} />
                  <span style={{ fontSize: '0.65rem' }}>Download</span>
                </button>

                <button
                  onClick={() => setShowReportModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    flexDirection: 'column'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                  }}
                  title="Close Report"
                >
                  <span style={{ fontSize: '0.65rem' }}>Close</span>
                </button>
              </div>
            )}

            {/* Collapsed view - stacked buttons at bottom */}
            {sidebarCollapsed && (
              <>
                <button
                  onClick={generatePDF}
                  style={{
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#333333';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                  }}
                  title="Download PDF"
                >
                  <Download size={16} />
                </button>

                <button
                  onClick={() => setShowReportModal(false)}
                  style={{
                    padding: '0.625rem',
                    border: '2px solid #000000',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                  }}
                  title="Close Report"
                >
                  ✕
                </button>
              </>
            )}
          </div>

          {/* Toggle Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '-12px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '2px solid #000000',
              backgroundColor: '#ffffff',
              color: '#000000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              zIndex: 10
            }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '>' : '<'}
          </button>
        </div>

        {/* A4 SHEET CONTAINER */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          overflow: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            width: '794px',
            minHeight: '1123px',
            margin: '0 auto',
            border: '3px solid #000000',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            
            {/* Header */}
            <div 
              id="report-header"
              style={{
                borderBottom: `2px solid ${reportThemes[selectedTheme].headerBorder}`,
                padding: '1.5rem',
                backgroundColor: reportThemes[selectedTheme].headerBg,
                minHeight: logo || customFields.length > 0 ? '140px' : '100px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: customFields.length > 0 ? '1rem' : '0',
                position: 'relative',
                minHeight: '80px'
              }}>
                
                {/* Draggable Logo */}
                {logo && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${logoPosition.x}px`,
                      top: `${logoPosition.y}px`,
                      width: '120px',
                      height: '60px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.5rem',
                      border: logoPosition.isDragging ? '2px dashed #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '4px',
                      backgroundColor: logoPosition.isDragging ? '#eff6ff' : '#fafafa',
                      cursor: logoPosition.isDragging ? 'grabbing' : 'grab',
                      zIndex: logoPosition.isDragging ? 1000 : 1,
                      transition: logoPosition.isDragging ? 'none' : 'border-color 0.2s, background-color 0.2s',
                      boxShadow: logoPosition.isDragging ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'
                    }}
                    onMouseDown={handleLogoMouseDown}
                    title="Drag to reposition logo"
                  >
                    <img 
                      src={logo} 
                      alt="Company Logo" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                )}
                
                <div style={{ 
                  flex: 1, 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '0 1rem',
                  zIndex: 0
                }}>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '1.875rem', 
                    fontWeight: '700', 
                    color: reportThemes[selectedTheme].titleColor,
                    letterSpacing: '-0.025em',
                    textTransform: 'uppercase'
                  }}>
                    Inspection Report
                  </h2>
                  <p style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.875rem',
                    color: reportThemes[selectedTheme].subtitleColor,
                    fontWeight: '500',
                    letterSpacing: '0.05em'
                  }}>
                    Quality Management System
                  </p>
                </div>
                
                <div style={{ width: '120px' }}></div>
              </div>
              
              {/* Custom Fields */}
              {customFields.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: customFields.length === 1 ? '1fr' : 
                                       customFields.length === 2 ? 'repeat(2, 1fr)' : 
                                       'repeat(3, 1fr)',
                  gap: '0.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #d1d5db'
                }}>
                  {customFields.map((field) => (
                    <div key={field.id} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.125rem',
                      padding: '0.5rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {field.name}
                      </span>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#111827',
                        wordBreak: 'break-word'
                      }}>
                        {field.value || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Position Reset Button */}
              {logo && (
                <button
                  onClick={() => setLogoPosition({ x: 0, y: 0, isDragging: false })}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#6b7280',
                    fontSize: '0.625rem',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  title="Reset logo position"
                >
                  Reset Position
                </button>
              )}
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              padding: '1.5rem',
              overflow: 'auto'
            }}>
              {reportLoading && (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e5e7eb',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }}></div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading report data...</div>
                </div>
              )}

              {reportError && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem',
                  color: '#ef4444',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca'
                }}>
                  <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Error loading report
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>{reportError}</div>
                </div>
              )}

              {!reportLoading && !reportError && reportData && (
                <div>
                  {/* Part Information */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ 
                      margin: '0 0 0.75rem 0', 
                      fontSize: '1rem', 
                      fontWeight: '700', 
                      color: '#111827',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em',
                      borderBottom: '2px solid #e5e7eb',
                      paddingBottom: '0.5rem'
                    }}>
                      Part Information
                    </h3>
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: `repeat(${4 + customHeaders.length}, 1fr)`,
                        gap: '1rem'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                            PART NUMBER
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {reportData.part_no || 'N/A'}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                            PART NAME
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {reportData.part_name || 'N/A'}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                            PROJECT
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {reportData.boc?.project?.name || 'N/A'}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                            QTY
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {reportData.boc?.quantity || 'N/A'}
                          </div>
                        </div>

                        {/* Custom Headers */}
                        {customHeaders.map((header, index) => (
                          <div key={index}>
                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                              {header.name.toUpperCase()}
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {header.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Editable Table with Context Menu */}
                  {tableData.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ 
                        margin: '0 0 0.75rem 0', 
                        fontSize: '1rem', 
                        fontWeight: '700', 
                        color: '#111827',
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em',
                        borderBottom: '2px solid #e5e7eb',
                        paddingBottom: '0.5rem'
                      }}>
                        Inspection Data
                        {isEditing && (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#059669',
                            marginLeft: '0.5rem'
                          }}>
                            (Editing Mode - Right-click for options)
                          </span>
                        )}
                      </h3>

                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        fontSize: '0.75rem'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            {tableHeaders.map((header, colIndex) => (
                              <th 
                                key={colIndex}
                                onContextMenu={(e) => isEditing && handleContextMenu(e, null, colIndex)}
                                style={{ 
                                  padding: '0.5rem', 
                                  textAlign: 'left', 
                                  fontWeight: '700', 
                                  color: '#374151', 
                                  borderBottom: '2px solid #e5e7eb', 
                                  borderRight: '1px solid #e5e7eb', 
                                  fontSize: '0.7rem', 
                                  textTransform: 'uppercase',
                                  cursor: isEditing ? 'context-menu' : 'default'
                                }}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row, rowIndex) => (
                            <tr 
                              key={rowIndex} 
                              style={{ backgroundColor: rowIndex % 2 === 0 ? 'white' : '#fafafa' }}
                            >
                              {tableHeaders.map((header, colIndex) => {
                                const keys = ['nominal', 'tolerance', 'type', 'm1', 'm2', 'm3', 'mean', 'status'];
                                const cellKey = colIndex < keys.length ? keys[colIndex] : `col_${colIndex}`;
                                const cellValue = row[cellKey] || 'N/A';
                                
                                return (
                                  <td 
                                    key={colIndex}
                                    onContextMenu={(e) => isEditing && handleContextMenu(e, rowIndex, colIndex)}
                                    style={{ 
                                      padding: '0.5rem', 
                                      color: '#374151', 
                                      borderBottom: '1px solid #e5e7eb', 
                                      borderRight: colIndex === tableHeaders.length - 1 ? 'none' : '1px solid #e5e7eb',
                                      textAlign: colIndex >= 3 && colIndex <= 6 ? 'center' : 'left',
                                      backgroundColor: isEditing ? '#f9fafb' : 'transparent',
                                      cursor: isEditing ? 'context-menu' : 'default'
                                    }}
                                    contentEditable={isEditing && colIndex !== 7}
                                    suppressContentEditableWarning={true}
                                    onBlur={(e) => {
                                      if (isEditing && colIndex !== 7) {
                                        const newData = [...tableData];
                                        newData[rowIndex][cellKey] = e.currentTarget.textContent;
                                        setTableData(newData);
                                      }
                                    }}
                                  >
                                    {colIndex === 7 ? (
                                      <span style={{ 
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        backgroundColor: cellValue === 'GO' ? '#d1fae5' : cellValue === 'NO-GO' ? '#fee2e2' : '#f3f4f6',
                                        color: cellValue === 'GO' ? '#065f46' : cellValue === 'NO-GO' ? '#991b1b' : '#6b7280',
                                        display: 'inline-block'
                                      }}>
                                        {cellValue}
                                      </span>
                                    ) : (
                                      cellValue
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div style={{
              borderTop: '2px solid #000000',
              padding: '1rem 1.5rem',
              backgroundColor: '#f9fafb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              <span>Generated on {new Date().toLocaleDateString()}</span>
              <span>{partData.name || 'Direct Part'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {CustomHeadersModal()}
      {LogoUploadModal()}
      {ThemesModal()}
      {ContextMenu()}
    </div>
  );
};

export default Report;