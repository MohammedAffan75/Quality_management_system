// d:\Project_management\my-app\src\components\ProjectCreation.jsx
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Folder, Eye, FileText, Search, ChevronDown } from 'lucide-react';
import { NavContext } from '../App';
import useProjectStore from '../store/projectCreation';
import './ProjectCreation.css';

const EMPTY_VALUE = '—';

const ProjectCreation = () => {
  const navigate = useNavigate();
  const { setActiveNav } = useContext(NavContext);
  
  const { 
    projects, 
    updateProject, 
    deleteProject, 
    setSelectedProject,
    createProject,
    fetchProjects,
    fetchProjectDetails,
    loading,
    error
  } = useProjectStore();
  
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [modalData, setModalData] = useState({ 
    project_number: '',
    name: '', 
    customer_details: '',
    reference_no: '',
    id: Date.now().toString(),
    created: new Date().toISOString().split('T')[0],
    status: 'Active',
    editId: null
  });
  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects().catch(console.error);
  }, [fetchProjects]);

  // Recent projects: 5 most recently created
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.created_at || b.created || 0) - new Date(a.created_at || a.created || 0))
      .slice(0, 5);
  }, [projects]);

  // Filtered and sorted projects for the table
  const filteredAndSortedProjects = useMemo(() => {
    let result = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.project_number || '').toLowerCase().includes(q) ||
          (p.customer_details || '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const dateA = new Date(a.created_at || a.created || 0);
      const dateB = new Date(b.created_at || b.created || 0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [projects, searchQuery, sortOrder]);

  const formatDate = (project) => {
    const d = project.created_at || project.created;
    if (!d) return EMPTY_VALUE;
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const safeValue = (val) => (val != null && val !== '' ? val : EMPTY_VALUE);

  // Top 3 latest project IDs — NEW badge only for these (design: if everything is highlighted, nothing is)
  const top3LatestIds = useMemo(() => {
    const sorted = [...projects].sort(
      (a, b) => new Date(b.created_at || b.created || 0) - new Date(a.created_at || a.created || 0)
    );
    return new Set(sorted.slice(0, 3).map((p) => p.id));
  }, [projects]);

  const isTop3New = (projectId) => top3LatestIds.has(projectId);
  const handleSave = async () => {
    if (!modalData.project_number?.trim() || !modalData.name?.trim()) return;
    try {
      if (modalData.editId) {
        // Update existing project via API
        await updateProject(modalData.editId, {
          project_number: modalData.project_number.trim(),
          name: modalData.name.trim(),
          customer_details: modalData.customer_details?.trim() || null,
          reference_no: modalData.reference_no?.trim() || null
        });
      } else {
        // Create new project via API
        await createProject({
          project_number: modalData.project_number.trim(),
          name: modalData.name.trim(),
          customer_details: modalData.customer_details?.trim() || null,
          reference_no: modalData.reference_no?.trim() || null
        });
      }
      setShowModal(false);
      setModalData({ 
        project_number: '',
        name: '', 
        customer_details: '',
        reference_no: '',
        id: Date.now().toString(),
        created: new Date().toISOString().split('T')[0],
        status: 'Active',
        editId: null
      });
    } catch (error) {
      // Error is already handled in the store
      console.error('Failed to save project:', error);
    }
  };
  const handleEdit = (project) => {
    setModalData({ 
      project_number: project.project_number || '',
      name: project.name, 
      customer_details: project.customer_details || '',
      reference_no: project.reference_no || '',
      id: project.id,
      created: project.created_at || project.created,
      status: project.status || 'Active',
      editId: project.id
    });
    setShowModal(true);
  };
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
        // Success is handled in the store
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };
  const handleViewAssembly = async (project) => {
    try {
      // Fetch project details before navigating
      await fetchProjectDetails(project.id);
      setSelectedProject(project);
      setActiveNav('assembly');
      navigate('/Assembly');
    } catch (error) {
      console.error('Failed to fetch project details:', error);
      // Still navigate even if details fetch fails
      setSelectedProject(project);
      setActiveNav('assembly');
      navigate('/Assembly');
    }
  };
  // Add error display
  const ErrorAlert = () => {
    if (!error) return null;
    
    return (
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        padding: '0.75rem',
        marginBottom: '1rem',
        color: '#dc2626'
      }}>
        <strong>Error:</strong> {error}
      </div>
    );
  };
  return (
    <div className="project-management-page">
      <div className="project-management-main">
        <ErrorAlert />
        
        <div className="content-header">
          <h1 className="page-title">
            <FileText size={22} />
            Project Management
          </h1>
          <button
            onClick={() => {
              setModalData({ 
                project_number: '',
                name: '', 
                customer_details: '',
                reference_no: '',
                id: Date.now().toString(),
                created: new Date().toISOString().split('T')[0],
                status: 'Active',
                editId: null
              });
              setShowModal(true);
            }}
            className="btn btn-primary"
            disabled={loading}
          >
            <Plus size={16} />
            New Project
          </button>
        </div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <section className="section recent-projects-section">
            <h2 className="section-title">Recent Projects</h2>
            <div className="recent-projects-grid">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="recent-project-card"
                  onClick={() => handleViewAssembly(project)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleViewAssembly(project)}
                >
                  <span className="recent-project-name">{safeValue(project.name)}</span>
                  <span className="recent-project-date">{formatDate(project)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Projects */}
        <section className="section all-projects-section">
          <h2 className="section-title">All Projects</h2>
          
          {loading && projects.length === 0 ? (
            <div className="empty-state">
              <div className="spinner" />
              <p className="empty-state-text">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <Folder className="empty-state-icon" />
              <p className="empty-state-text">No projects yet. Create your first project!</p>
            </div>
          ) : (
            <>
              <div className="table-toolbar">
                <div className="search-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by name, project no, or customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className={`sort-wrapper ${sortOrder === 'newest' ? 'sort-active' : ''}`}>
                  <select
                    className="sort-select"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                  <ChevronDown size={16} className="sort-chevron" />
                </div>
              </div>

              <div className="projects-table-wrapper">
                <table className="projects-table">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Project No</th>
                      <th>Created Date</th>
                      <th>Customer</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedProjects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="table-empty-cell">
                          No projects match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedProjects.map((project) => (
                        <tr
                          key={project.id}
                          className="project-row"
                          onClick={() => handleViewAssembly(project)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleViewAssembly(project)}
                        >
                          <td className="td-name">
                            <Folder size={16} className="row-icon" />
                            {safeValue(project.name)}
                            {isTop3New(project.id) && <span className="table-new-badge">New</span>}
                          </td>
                          <td className="td-project-no">{safeValue(project.project_number || project.id)}</td>
                          <td className="td-date">{formatDate(project)}</td>
                          <td className="td-customer">{safeValue(project.customer_details)}</td>
                          <td className="td-actions">
                            <div className="row-actions">
                              <button
                                className="btn-icon view"
                                onClick={(e) => { e.stopPropagation(); handleViewAssembly(project); }}
                                title="View Assembly"
                                disabled={loading}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                className="btn-icon edit"
                                onClick={(e) => { e.stopPropagation(); handleEdit(project); }}
                                title="Edit"
                                disabled={loading}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="btn-icon delete"
                                onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                                title="Delete"
                                disabled={loading}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalData.editId ? 'Edit' : 'Create'} Project
              </h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Project Number <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={modalData.project_number}
                  onChange={(e) => setModalData({...modalData, project_number: e.target.value})}
                  placeholder="Enter project number"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Project Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={modalData.name}
                  onChange={(e) => setModalData({...modalData, name: e.target.value})}
                  placeholder="Enter project name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Customer Details <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={modalData.customer_details}
                  onChange={(e) => setModalData({...modalData, customer_details: e.target.value})}
                  placeholder="Enter customer details if present"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reference No <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={modalData.reference_no}
                  onChange={(e) => setModalData({...modalData, reference_no: e.target.value})}
                  placeholder="Enter reference number if present"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn"
                onClick={() => setShowModal(false)}
                disabled={loading}
              >                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!modalData.project_number?.trim() || !modalData.name?.trim() || loading}
              >
                {loading ? 'Saving...' : (modalData.editId ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectCreation;