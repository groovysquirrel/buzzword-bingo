import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import './WordManager.css';

interface WordCategory {
  category: string;
  words: string[];
}

interface CategoryStats {
  totalCategories: number;
  totalWords: number;
  categoriesWithWords: number;
}

export default function WordManager() {
  const [categories, setCategories] = useState<WordCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  
  // Form states
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [_editingCategory, setEditingCategory] = useState<WordCategory | null>(null);
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryWords, setNewCategoryWords] = useState('');

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Update stats whenever categories change
  useEffect(() => {
    if (categories.length > 0) {
      updateStats();
    }
  }, [categories]);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      console.log('Loading word categories...');
      const result = await API.get('api', '/admin/words/categories', {});
      
      if (result.success) {
        setCategories(result.categories || []);
        console.log('Loaded categories:', result.categories);
      } else {
        setError(result.error || 'Failed to load categories');
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultWords = async () => {
    if (!confirm('This will seed the database with default word categories. Continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Seeding default words...');
      const result = await API.post('api', '/admin/words/seed', {});
      
      if (result.success) {
        await loadCategories(); // Reload categories after seeding
        setSuccessMessage(`Successfully seeded ${result.categoriesCreated} categories with ${result.totalWords} words!`);
      } else {
        setError(result.error || 'Failed to seed words');
      }
    } catch (err) {
      console.error('Failed to seed words:', err);
      setError(err instanceof Error ? err.message : 'Failed to seed words');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = () => {
    const totalCategories = categories.length;
    const totalWords = categories.reduce((sum, cat) => sum + cat.words.length, 0);
    const categoriesWithWords = categories.filter(cat => cat.words.length > 0).length;
    
    setStats({
      totalCategories,
      totalWords,
      categoriesWithWords
    });
  };

  const handleAddCategory = () => {
    // Reset form
    setNewCategoryName('');
    setNewCategoryWords('');
    setShowAddBanner(true);
  };

  const handleCancelAdd = () => {
    setNewCategoryName('');
    setNewCategoryWords('');
    setShowAddBanner(false);
  };

  const handleEditCategory = (category: WordCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.category);
    setNewCategoryWords(category.words.join(', '));
    setShowEditCategory(true);
  };

  const saveCategory = async (isEditing: boolean = false) => {
    if (!newCategoryName.trim()) {
      alert('Category name is required');
      return;
    }

    const words = newCategoryWords
      .split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);

    if (words.length === 0) {
      alert('At least one word is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Saving category to database...');
      const result = await API.post('api', '/admin/words/categories', {
        body: {
          category: newCategoryName.trim(),
          words: words
        }
      });

      if (result.success) {
        // Reload categories to get the updated data
        await loadCategories();
        
        // Show success message
        const action = isEditing ? 'updated' : 'created';
        setSuccessMessage(`Successfully ${action} category "${newCategoryName.trim()}" with ${words.length} words!`);
        
        // Close forms
        setShowAddBanner(false);
        setShowEditCategory(false);
        setEditingCategory(null);
      } else {
        setError(result.error || 'Failed to save category');
      }
    } catch (err) {
      console.error('Failed to save category:', err);
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the "${categoryName}" category?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Deleting category from database...');
      const encodedCategoryName = encodeURIComponent(categoryName);
      const result = await API.del('api', `/admin/words/categories/${encodedCategoryName}`, {});

      if (result.success) {
        // Reload categories to get the updated data
        await loadCategories();
        setSuccessMessage(`Successfully deleted category "${categoryName}"`);
      } else {
        setError(result.error || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'technology': return 'primary';
      case 'business': return 'success';
      case 'strategy': return 'warning';
      case 'process': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <div className="word-manager">
      {/* Header Actions */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h3 className="word-manager-title">Word Categories</h3>
              <p className="word-manager-subtitle">
                Manage buzzwords and categories for bingo card generation
              </p>
            </div>
            <div className="word-manager-actions">
              <Button 
                variant="outline-primary" 
                onClick={loadCategories}
                disabled={loading}
                className="me-2"
              >
                {loading ? <Spinner size="sm" className="me-1" /> : null}
                🔄 Refresh
              </Button>
              <Button 
                variant="outline-success" 
                onClick={seedDefaultWords}
                disabled={loading}
                className="me-2"
              >
                🌱 Seed Defaults
              </Button>
              <Button 
                variant="primary" 
                onClick={handleAddCategory}
                disabled={loading}
              >
                ➕ Add Category
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Status Messages */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
          <Alert.Heading>⚠️ Error</Alert.Heading>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)} className="mb-4">
          <Alert.Heading>✅ Success</Alert.Heading>
          {successMessage}
        </Alert>
      )}


      {/* Add Category Banner */}
      {showAddBanner && (
        <Card className="mb-4 word-manager-add-banner">
          <Card.Header className="bg-primary text-white">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">➕ Add New Word Category</h5>
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={handleCancelAdd}
              >
                ✕
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            <Form>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Category Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g., Technology, Business..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Words (comma-separated)</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="AI, Machine Learning, Cloud Computing..."
                      value={newCategoryWords}
                      onChange={(e) => setNewCategoryWords(e.target.value)}
                    />
                    <Form.Text className="text-muted">
                      Enter words separated by commas
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex gap-2">
                <Button 
                  variant="primary" 
                  onClick={() => saveCategory(false)}
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" className="me-1" /> : null}
                  💾 Save Category
                </Button>
                <Button 
                  variant="outline-secondary" 
                  onClick={handleCancelAdd}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}



      {/* Stats Cards */}
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <div className="word-manager-stat-card">
              <div className="word-manager-stat-card__icon">📚</div>
              <div className="word-manager-stat-card__value">{stats.totalCategories}</div>
              <div className="word-manager-stat-card__label">Categories</div>
            </div>
          </Col>
          <Col md={3}>
            <div className="word-manager-stat-card">
              <div className="word-manager-stat-card__icon">📝</div>
              <div className="word-manager-stat-card__value">{stats.totalWords}</div>
              <div className="word-manager-stat-card__label">Total Words</div>
            </div>
          </Col>
          <Col md={3}>
            <div className="word-manager-stat-card">
              <div className="word-manager-stat-card__icon">✅</div>
              <div className="word-manager-stat-card__value">{stats.categoriesWithWords}</div>
              <div className="word-manager-stat-card__label">Active Categories</div>
            </div>
          </Col>
          <Col md={3}>
            <div className="word-manager-stat-card">
              <div className="word-manager-stat-card__icon">📊</div>
              <div className="word-manager-stat-card__value">
                {stats.totalCategories > 0 ? Math.round(stats.totalWords / stats.totalCategories) : 0}
              </div>
              <div className="word-manager-stat-card__label">Avg Words/Category</div>
            </div>
          </Col>
        </Row>
      )}


      {/* Categories Grid */}
      {categories.length > 0 ? (
        <Row>
          {categories.map((category, index) => (
            <Col md={6} lg={4} key={index} className="mb-4">
              <Card className="word-manager-category-card h-100">
                <Card.Header className="word-manager-category-card__header">
                  {/* Category Name - Full Width */}
                  <div className="mb-2">
                    <Badge bg={getCategoryColor(category.category)} className="word-manager-category-badge">
                      {category.category}
                    </Badge>
                  </div>
                  {/* Word Count and Actions */}
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted fw-semibold">
                      📝 {category.words.length} words
                    </small>
                    <div className="word-manager-category-actions">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        className="me-1"
                        title="Edit category"
                      >
                        ✏️
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => deleteCategory(category.category)}
                        title="Delete category"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body className="word-manager-category-card__body">
                  <div className="word-manager-words-grid">
                    {category.words.map((word, wordIndex) => (
                      <span key={wordIndex} className="word-manager-word-tag">
                        {word}
                      </span>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <div className="word-manager-empty">
          <div className="word-manager-empty__content">
            <div className="word-manager-empty__icon">📚</div>
            <h4>No Word Categories</h4>
            <p>Get started by seeding default categories or adding your own.</p>
            <Button variant="primary" onClick={seedDefaultWords} disabled={loading}>
              🌱 Seed Default Words
            </Button>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      <Modal show={showEditCategory} onHide={() => setShowEditCategory(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Word Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Category Name</Form.Label>
              <Form.Control
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Words (comma-separated)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={newCategoryWords}
                onChange={(e) => setNewCategoryWords(e.target.value)}
              />
              <Form.Text className="text-muted">
                Enter words separated by commas. Extra spaces will be automatically trimmed.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditCategory(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => saveCategory(true)}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
