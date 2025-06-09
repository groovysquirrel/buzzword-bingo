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
import ListGroup from 'react-bootstrap/ListGroup';
import './GameCreator.css';

interface WordCategory {
  category: string;
  words: string[];
}

interface GameSettings {
  gridSize: "3x3" | "4x4" | "5x5";
  selectedCategories: string[];
  gameMode: "normal" | "speed" | "challenge";
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
  
  // Game settings
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    gridSize: "5x5",
    selectedCategories: [],
    gameMode: "normal"
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
          selectedCategories: [],
          gameMode: "normal"
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

  return (
    <div className="game-creator">
      {/* Header */}
      <div className="game-creator-header mb-4">
        <h3 className="game-creator-title">🎮 Create New Game</h3>
        <p className="game-creator-subtitle">
          Configure game settings, select word categories, and create targeted corporate bingo experiences
        </p>
      </div>

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

      <Row>
        {/* Game Settings Panel */}
        <Col lg={4}>
          <Card className="game-creator-settings-card mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">⚙️ Game Settings</h5>
            </Card.Header>
            <Card.Body>
              {/* Grid Size Selection */}
              <Form.Group className="mb-4">
                <Form.Label>Grid Size</Form.Label>
                {Object.entries(GRID_REQUIREMENTS).map(([size, info]) => (
                  <Form.Check
                    key={size}
                    type="radio"
                    id={`grid-${size}`}
                    name="gridSize"
                    label={
                      <div>
                        <strong>{size}</strong> ({info.markable} words needed)
                        <br />
                        <small className="text-muted">{info.description}</small>
                      </div>
                    }
                    checked={gameSettings.gridSize === size}
                    onChange={() => setGameSettings(prev => ({ ...prev, gridSize: size as any }))}
                    className="mb-2"
                  />
                ))}
              </Form.Group>

              {/* Game Mode */}
              <Form.Group className="mb-4">
                <Form.Label>Game Mode</Form.Label>
                <Form.Select
                  value={gameSettings.gameMode}
                  onChange={(e) => setGameSettings(prev => ({ 
                    ...prev, 
                    gameMode: e.target.value as any 
                  }))}
                >
                  <option value="normal">Normal - Standard game pace</option>
                  <option value="speed">Speed - Fast-paced gameplay</option>
                  <option value="challenge">Challenge - Expert level</option>
                </Form.Select>
              </Form.Group>

              {/* Word Summary */}
              <div className="game-creator-word-summary">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">Word Requirements:</span>
                  <Badge bg={canCreateGame() ? "success" : "danger"}>
                    {getTotalAvailableWords()} / {getRequiredWords()} words
                  </Badge>
                </div>
                <div className="progress mb-3">
                  <div 
                    className={`progress-bar ${canCreateGame() ? 'bg-success' : 'bg-danger'}`}
                    style={{ 
                      width: `${Math.min(100, (getTotalAvailableWords() / getRequiredWords()) * 100)}%` 
                    }}
                  />
                </div>
                
                <Button 
                  variant="success" 
                  size="lg" 
                  className="w-100"
                  onClick={createGame}
                  disabled={!canCreateGame() || loading}
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
            </Card.Body>
          </Card>
        </Col>

        {/* Category Selection Panel */}
        <Col lg={8}>
          <Card className="game-creator-categories-card">
            <Card.Header className="bg-info text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">📚 Word Categories</h5>
                <Badge bg="light" text="dark">
                  {gameSettings.selectedCategories.length} selected
                </Badge>
              </div>
            </Card.Header>
            <Card.Body>
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
                <ListGroup variant="flush">
                  {categories.map((category) => (
                    <ListGroup.Item 
                      key={category.category}
                      className={`game-creator-category-item ${
                        gameSettings.selectedCategories.includes(category.category) ? 'selected' : ''
                      }`}
                      action
                      onClick={() => handleCategoryToggle(category.category)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <Form.Check
                            type="checkbox"
                            checked={gameSettings.selectedCategories.includes(category.category)}
                            onChange={() => {}} // Handled by onClick
                            className="me-3"
                          />
                          <div>
                            <div className="d-flex align-items-center mb-1">
                              <Badge bg={getCategoryColor(category.category)} className="me-2">
                                {category.category}
                              </Badge>
                              <small className="text-muted">
                                {category.words.length} words
                              </small>
                            </div>
                            <div className="game-creator-word-preview">
                              {category.words.slice(0, 5).join(', ')}
                              {category.words.length > 5 && '...'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
} 