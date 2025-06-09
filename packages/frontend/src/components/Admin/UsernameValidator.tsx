import { useState } from "react";
import { API } from "aws-amplify";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";

interface UsernameTestResult {
  username: string;
  status: "approved" | "rejected";
  message: string;
  alternateName?: string;
  usedAI: boolean;
  rejectionReason?: string;
  aiGeneratedReason?: string;
  timestamp: string;
}

interface UsernameValidatorProps {
  maxResults?: number;
  showCard?: boolean;
}

export default function UsernameValidator({ 
  maxResults = 5, 
  showCard = true 
}: UsernameValidatorProps) {
  const [testUsername, setTestUsername] = useState("");
  const [testingUsername, setTestingUsername] = useState(false);
  const [testResults, setTestResults] = useState<UsernameTestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const testUsernameValidation = async () => {
    if (!testUsername.trim()) {
      setError("Please enter a username to test");
      return;
    }

    setTestingUsername(true);
    setError(null);
    
    try {
      const result = await API.post("api", "/admin/test/username", {
        body: { nickname: testUsername.trim() }
      });
      
      // Add result to history
      setTestResults(prev => [{
        username: testUsername.trim(),
        status: result.status,
        message: result.message,
        alternateName: result.alternateName,
        usedAI: result.usedAI,
        rejectionReason: result.rejectionReason,
        aiGeneratedReason: result.aiGeneratedReason,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, maxResults - 1)]);
      
      setTestUsername("");
      
    } catch (error: any) {
      console.error("Username test error:", error);
      setError("Failed to test username: " + (error instanceof Error ? error.message : String(error)));
      setTestUsername("");
    }
    
    setTestingUsername(false);
  };

  const clearTestResults = () => {
    setTestResults([]);
    setError(null);
  };

  const content = (
    <div className="username-validator">
      <div className="mb-3">
        <Form.Label className="fw-semibold mb-2">
          🤖 AI Username Validator
          <span className="text-muted fw-normal ms-1">(Llama 3)</span>
        </Form.Label>
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            value={testUsername}
            onChange={(e) => setTestUsername(e.target.value)}
            placeholder="Test a username..."
            size="sm"
            disabled={testingUsername}
            onKeyPress={(e) => e.key === 'Enter' && testUsernameValidation()}
          />
          <Button 
            onClick={testUsernameValidation} 
            disabled={testingUsername || !testUsername.trim()}
            size="sm"
            variant="outline-primary"
          >
            {testingUsername ? "..." : "Test"}
          </Button>
        </div>
        
        {error && (
          <div className="text-danger small mt-2">{error}</div>
        )}
      </div>
      
      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="username-test-results">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small fw-bold">Recent Tests ({testResults.length})</span>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={clearTestResults}
            >
              Clear
            </Button>
          </div>
          <div className="username-test-results-list">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`username-test-result p-2 mb-2 rounded border ${
                  result.status === 'approved' 
                    ? 'bg-success-subtle border-success-subtle' 
                    : 'bg-danger-subtle border-danger-subtle'
                }`}
              >
                <div className="username-test-result-header d-flex justify-content-between align-items-start">
                  <div className="fw-semibold small">{result.username}</div>
                  <div className="text-end">
                    <span className={`badge ${result.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                      {result.status === 'approved' ? '✅' : '❌'}
                    </span>
                    <div className="text-muted small">
                      {result.usedAI ? 'AI' : 'Fallback'}
                    </div>
                  </div>
                </div>
                
                <div className="username-test-result-content mt-1">
                  {result.status === 'approved' ? (
                    <div className="text-success small">
                      Approved {result.alternateName && `→ Try: "${result.alternateName}"`}
                    </div>
                  ) : (
                    <div>
                      <div className="text-danger small">
                        Rejected {result.alternateName && (
                          <span className="text-muted">→ Try: "{result.alternateName}"</span>
                        )}
                      </div>
                      {result.aiGeneratedReason && (
                        <div className="mt-2 p-2 bg-light rounded">
                          <div className="text-muted fw-semibold small mb-1">🤖 AI Reasoning:</div>
                          <div className="text-dark small fst-italic lh-sm">
                            "{result.aiGeneratedReason}"
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
          <Card.Title className="mb-0 h6">🤖 Username Validator</Card.Title>
        </Card.Header>
        <Card.Body>
          {content}
        </Card.Body>
      </Card>
    );
  }

  return content;
} 