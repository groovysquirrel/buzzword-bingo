import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Modal from 'react-bootstrap/Modal';
import './GameCreator.css';

interface WordCategory {
  category: string;
  words: string[];
}

interface GameSettings {
  gridSize: "3x3" | "4x4" | "5x5";
  selectedCategories: string[];
}

const GRID_REQUIREMENTS = {
  "3x3": { total: 9, markable: 8, description: "Quick 3x3 grid - perfect for short meetings" },
  "4x4": { total: 16, markable: 15, description: "Medium 4x4 grid - ideal for workshops" },
  "5x5": { total: 25, markable: 24, description: "Classic 5x5 grid - full conference experience" }
};

interface GameCreatorProps {
  onGameCreated?: (gameId: string) => void;
}

export default function GameCreator({ onGameCreated }: GameCreatorProps) {
  const [categories, setCategories] = useState<WordCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Game settings
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    gridSize: "5x5",
    selectedCategories: []
  });

  // Load available categories
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await API.get('api', '/admin/words/categories', {});
      
      if (result.success) {
        setCategories(result.categories || []);
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

  const handleCategoryToggle = (categoryName: string) => {
    setGameSettings(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryName)
        ? prev.selectedCategories.filter(cat => cat !== categoryName)
        : [...prev.selectedCategories, categoryName]
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const getTotalAvailableWords = () => {
    return categories
      .filter(cat => gameSettings.selectedCategories.includes(cat.category))
      .reduce((total, cat) => total + cat.words.length, 0);
  };

  const getRequiredWords = () => {
    return GRID_REQUIREMENTS[gameSettings.gridSize].markable;
  };

  const canCreateGame = () => {
    const totalWords = getTotalAvailableWords();
    const requiredWords = getRequiredWords();
    return gameSettings.selectedCategories.length > 0 && totalWords >= requiredWords;
  };

  const createGame = async () => {
    if (!canCreateGame()) {
      setError('Please select enough categories to meet word requirements');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await API.post('api', '/admin/games/create-with-settings', {
        body: gameSettings
      });

      if (result.success) {
        setSuccessMessage(
          `Successfully created game ${result.gameId} with ${gameSettings.gridSize} grid using ${gameSettings.selectedCategories.length} categories (${result.availableWordCount} words available)`
        );
        
        // Reset selections after successful creation
        setGameSettings({
          gridSize: "5x5",
          selectedCategories: []
        });

        // Notify parent component if callback provided
        if (onGameCreated) {
          onGameCreated(result.gameId);
        }
      } else {
        setError(result.error || 'Failed to create game');
      }
    } catch (err) {
      console.error('Failed to create game:', err);
      setError(err instanceof Error ? err.message : 'Failed to create game');
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

  const handleGridSizeSelect = (size: "3x3" | "4x4" | "5x5") => {
    setGameSettings(prev => ({ ...prev, gridSize: size }));
    setShowCategoryModal(true);
  };

  return (
    <div className="container-fluid">
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

      {/* Grid Size Selection */}
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary text-white text-center">
              <h4 className="mb-0">🎯 Create New Game</h4>
              <small>Choose your grid size to get started</small>
            </Card.Header>
            <Card.Body className="p-4">
              <h5 className="text-center mb-4">Select Grid Size</h5>
              <Row className="g-3">
                {Object.entries(GRID_REQUIREMENTS).map(([size, info]) => (
                  <Col md={4} key={size}>
                    <Card 
                      className={`h-100 border-2 cursor-pointer ${gameSettings.gridSize === size ? 'border-primary bg-light' : 'border-light'}`}
                      onClick={() => handleGridSizeSelect(size as any)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <Card.Body className="text-center p-4">
                        <div className="display-6 mb-3">{size}</div>
                        <h6 className="text-primary">{info.markable} words needed</h6>
                        <p className="text-muted small mb-0">{info.description}</p>
                        {gameSettings.selectedCategories.length > 0 && gameSettings.gridSize === size && (
                          <Badge bg="success" className="mt-2">
                            {gameSettings.selectedCategories.length} categories selected
                          </Badge>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              
              {gameSettings.selectedCategories.length > 0 && (
                <div className="text-center mt-4">
                  <div className="d-flex justify-content-center align-items-center mb-3">
                    <span className="me-3">Word Requirements:</span>
                    <Badge bg={canCreateGame() ? "success" : "danger"} className="fs-6">
                      {getTotalAvailableWords()} / {getRequiredWords()} words
                    </Badge>
                  </div>
                  <div className="progress mb-3" style={{ height: '10px' }}>
                    <div 
                      className={`progress-bar ${canCreateGame() ? 'bg-success' : 'bg-danger'}`}
                      style={{ width: `${Math.min(100, (getTotalAvailableWords() / getRequiredWords()) * 100)}%` }}
                    />
                  </div>
                  
                  <Button 
                    variant={canCreateGame() ? "success" : "outline-secondary"}
                    size="lg" 
                    onClick={createGame}
                    disabled={!canCreateGame() || loading}
                    className="px-5"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Creating Game...
                      </>
                    ) : (
                      <>🚀 Create Game</>
                    )}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Category Selection Modal */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            📚 Select Word Categories for {gameSettings.gridSize} Grid
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3 text-center">
            <Badge bg="info" className="fs-6">
              Need {getRequiredWords()} words minimum
            </Badge>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <Spinner className="me-2" />
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <Alert variant="warning">
              <h6>No Categories Available</h6>
              <p>Please create some word categories first before creating games.</p>
              <Button variant="outline-primary" onClick={loadCategories}>
                🔄 Reload Categories
              </Button>
            </Alert>
          ) : (
            <Row className="g-3">
              {categories.map((category) => (
                <Col sm={6} md={4} key={category.category}>
                  <Card 
                    className={`h-100 border cursor-pointer ${
                      gameSettings.selectedCategories.includes(category.category) 
                        ? 'border-primary bg-light' 
                        : 'border-light'
                    }`}
                    onClick={() => handleCategoryToggle(category.category)}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <Card.Body className="p-3 text-center">
                      <Form.Check
                        type="checkbox"
                        checked={gameSettings.selectedCategories.includes(category.category)}
                        onChange={() => {}} // Handled by onClick
                        className="mb-2"
                      />
                      <Badge bg={getCategoryColor(category.category)} className="mb-2">
                        {category.category}
                      </Badge>
                      <div className="small text-muted mb-2">
                        {category.words.length} words
                      </div>
                      <div className="small text-truncate" title={category.words.slice(0, 5).join(', ')}>
                        {category.words.slice(0, 3).join(', ')}
                        {category.words.length > 3 && '...'}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <div>
            <Badge bg="secondary">
              {gameSettings.selectedCategories.length} categories selected
            </Badge>
            {getTotalAvailableWords() > 0 && (
              <Badge bg={canCreateGame() ? "success" : "warning"} className="ms-2">
                {getTotalAvailableWords()} words available
              </Badge>
            )}
          </div>
          <Button variant="primary" onClick={() => setShowCategoryModal(false)}>
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
} 