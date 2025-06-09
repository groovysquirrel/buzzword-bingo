import { useState } from "react";
import { API } from "aws-amplify";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";

interface WordTestResult {
  test: string;
  status: "success" | "error";
  message: string;
  data?: any;
  timestamp: string;
}

interface WordManagerTesterProps {
  maxResults?: number;
  showCard?: boolean;
}

export default function WordManagerTester({ 
  maxResults = 5, 
  showCard = true 
}: WordManagerTesterProps) {
  const [wordTesting, setWordTesting] = useState(false);
  const [testResults, setTestResults] = useState<WordTestResult[]>([]);

  const addTestResult = (test: string, status: "success" | "error", message: string, data?: any) => {
    setTestResults(prev => [{
      test,
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    }, ...prev.slice(0, maxResults - 1)]);
  };

  const testWordCategories = async () => {
    setWordTesting(true);
    
    try {
      const result = await API.get("api", "/admin/words/categories", {});
      
      addTestResult(
        "Load Categories",
        "success",
        `Loaded ${result.categories?.length || 0} categories with ${result.totalWords || 0} total words`,
        { 
          categories: result.categories?.length || 0,
          totalWords: result.totalWords || 0,
          fallbackUsed: result.fallbackUsed || false
        }
      );
      
    } catch (error: any) {
      addTestResult(
        "Load Categories",
        "error",
        error.message || "Failed to load categories"
      );
    }
    
    setWordTesting(false);
  };

  const testSeedCategories = async () => {
    setWordTesting(true);
    
    try {
      const result = await API.post("api", "/admin/words/seed", {});
      
      addTestResult(
        "Seed Categories",
        "success",
        `Seeded ${result.categoriesSeeded || 0} categories with ${result.totalWords || 0} words`,
        {
          categoriesSeeded: result.categoriesSeeded || 0,
          totalWords: result.totalWords || 0,
          categories: result.categories || []
        }
      );
      
    } catch (error: any) {
      addTestResult(
        "Seed Categories",
        "error",
        error.message || "Failed to seed categories"
      );
    }
    
    setWordTesting(false);
  };

  const testGameCreation = async () => {
    setWordTesting(true);
    
    try {
      // Test creating a new game to see if it uses dynamic words
      const result = await API.post("api", "/admin/games/create", {});
      
      addTestResult(
        "Game Creation",
        "success",
        `Created game with ${result.wordList?.length || 0} dynamic words`,
        { 
          gameId: result.gameId, 
          wordCount: result.wordList?.length || 0,
          gameStatus: result.status
        }
      );
      
    } catch (error: any) {
      addTestResult(
        "Game Creation", 
        "error",
        error.message || "Failed to create test game"
      );
    }
    
    setWordTesting(false);
  };

  const testWordGeneration = async () => {
    setWordTesting(true);
    
    try {
      // Test bingo card generation to see word selection
      const result = await API.get("api", "/current-game", {});
      
      if (result.gameId) {
        // Try to generate a bingo card to test word selection
        addTestResult(
          "Word Generation",
          "success",
          `Current game has ${result.wordList?.length || 'unknown'} words available`,
          {
            gameId: result.gameId,
            status: result.status,
            wordListLength: result.wordList?.length
          }
        );
      } else {
        addTestResult(
          "Word Generation",
          "error",
          "No active game found to test word generation"
        );
      }
      
    } catch (error: any) {
      addTestResult(
        "Word Generation",
        "error",
        error.message || "Failed to test word generation"
      );
    }
    
    setWordTesting(false);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const content = (
    <div className="word-manager-tester">
      <div className="mb-3">
        <div className="fw-semibold mb-3">
          📝 Word Management Tests
          <span className="text-muted fw-normal ms-1">(DynamoDB)</span>
        </div>
        
        <Row className="g-2">
          <Col xs={6}>
            <Button 
              onClick={testWordCategories} 
              disabled={wordTesting}
              size="sm"
              variant="outline-info"
              className="w-100"
            >
              {wordTesting ? "..." : "📂 Load"}
            </Button>
          </Col>
          <Col xs={6}>
            <Button 
              onClick={testSeedCategories} 
              disabled={wordTesting}
              size="sm"
              variant="outline-success"
              className="w-100"
            >
              {wordTesting ? "..." : "🌱 Seed"}
            </Button>
          </Col>
          <Col xs={6}>
            <Button 
              onClick={testGameCreation} 
              disabled={wordTesting}
              size="sm"
              variant="outline-primary"
              className="w-100"
            >
              {wordTesting ? "..." : "🎲 Game"}
            </Button>
          </Col>
          <Col xs={6}>
            <Button 
              onClick={testWordGeneration} 
              disabled={wordTesting}
              size="sm"
              variant="outline-warning"
              className="w-100"
            >
              {wordTesting ? "..." : "🔤 Words"}
            </Button>
          </Col>
        </Row>
      </div>
      
      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="word-test-results">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small fw-bold">Results ({testResults.length})</span>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={clearTestResults}
            >
              Clear
            </Button>
          </div>
          <div className="word-test-results-list">
            {testResults.slice(0, 4).map((result, index) => (
              <div
                key={index}
                className={`word-test-result p-2 mb-2 rounded border ${
                  result.status === 'success' 
                    ? 'bg-success-subtle border-success-subtle' 
                    : 'bg-danger-subtle border-danger-subtle'
                }`}
              >
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div className="fw-semibold small">{result.test}</div>
                  <Badge bg={result.status === 'success' ? 'success' : 'danger'}>
                    {result.status === 'success' ? '✅' : '❌'}
                  </Badge>
                </div>
                
                <div className="small text-muted mb-1">
                  {result.message}
                </div>
                
                {result.data && (
                  <details className="mt-2">
                    <summary className="small text-muted" style={{ cursor: 'pointer' }}>
                      📊 View Data
                    </summary>
                    <pre className="small mt-1 p-2 bg-light rounded" style={{ 
                      fontSize: '0.7rem', 
                      lineHeight: '1.2',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (showCard) {
    return (
      <Card className="h-100">
        <Card.Header className="bg-light">
          <Card.Title className="mb-0 h6">📝 Word Manager Tester</Card.Title>
        </Card.Header>
        <Card.Body>
          {content}
        </Card.Body>
      </Card>
    );
  }

  return content;
} 