/**
 * SystemTester Component
 * 
 * System testing tools for username validation and word management.
 * Focused on backend API testing and system validation.
 */

import { useState } from "react";
import { API } from "aws-amplify";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";

import "./SystemTester.css";

export default function SystemTester() {
  // State management
  const [error, setError] = useState<string | null>(null);

  // Username testing state
  const [testUsername, setTestUsername] = useState("");
  const [testingUsername, setTestingUsername] = useState(false);
  const [usernameTestResults, setUsernameTestResults] = useState<Array<{
    username: string;
    status: "approved" | "rejected";
    message: string;
    alternateName?: string;
    usedAI: boolean;
    rejectionReason?: string;
    aiGeneratedReason?: string;
    timestamp: string;
  }>>([]);

  // Word management testing state
  const [wordTesting, setWordTesting] = useState(false);
  const [wordTestResults, setWordTestResults] = useState<Array<{
    test: string;
    status: "success" | "error";
    message: string;
    data?: any;
    timestamp: string;
  }>>([]);

  // Test username validation with AI
  const testUsernameValidation = async () => {
    if (!testUsername.trim()) {
      setError("Please enter a username to test");
      return;
    }

    setTestingUsername(true);
    
    try {
      const result = await API.post("api", "/admin/test/username", {
        body: { nickname: testUsername.trim() }
      });
      
      // Add result to history (both approved and rejected come as 200 responses now)
      setUsernameTestResults(prev => [{
        username: testUsername.trim(),
        status: result.status,
        message: result.message,
        alternateName: result.alternateName,
        usedAI: result.usedAI,
        rejectionReason: result.rejectionReason,
        aiGeneratedReason: result.aiGeneratedReason,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]); // Keep last 10 results
      
      setTestUsername("");
      
    } catch (error: any) {
      console.error("Username test error:", error);
      
      // Only actual errors (network, etc.) should reach here now
      setError("Failed to test username: " + (error instanceof Error ? error.message : String(error)));
      setTestUsername("");
    }
    
    setTestingUsername(false);
  };

  // Clear username test results
  const clearUsernameTestResults = () => {
    setUsernameTestResults([]);
  };

  // Word Management Testing Functions
  const testWordCategories = async () => {
    setWordTesting(true);
    
    try {
      const result = await API.get("api", "/admin/words/categories", {});
      
      setWordTestResults(prev => [{
        test: "Load Categories",
        status: "success",
        message: `Loaded ${result.categories?.length || 0} categories with ${result.totalWords || 0} total words`,
        data: result,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
      
    } catch (error: any) {
      setWordTestResults(prev => [{
        test: "Load Categories",
        status: "error",
        message: error.message || "Failed to load categories",
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
    }
    
    setWordTesting(false);
  };

  const testSeedCategories = async () => {
    setWordTesting(true);
    
    try {
      const result = await API.post("api", "/admin/words/seed", {});
      
      setWordTestResults(prev => [{
        test: "Seed Categories",
        status: "success",
        message: `Seeded ${result.categoriesSeeded || 0} categories with ${result.totalWords || 0} words`,
        data: result,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
      
    } catch (error: any) {
      setWordTestResults(prev => [{
        test: "Seed Categories",
        status: "error",
        message: error.message || "Failed to seed categories",
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
    }
    
    setWordTesting(false);
  };

  const testGameCreation = async () => {
    setWordTesting(true);
    
    try {
      // Test creating a new game to see if it uses dynamic words
      const result = await API.post("api", "/admin/games/create", {});
      
      setWordTestResults(prev => [{
        test: "Game Creation",
        status: "success",
        message: `Created game with ${result.wordList?.length || 0} dynamic words`,
        data: { gameId: result.gameId, wordCount: result.wordList?.length },
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
      
    } catch (error: any) {
      setWordTestResults(prev => [{
        test: "Game Creation", 
        status: "error",
        message: error.message || "Failed to create test game",
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
    }
    
    setWordTesting(false);
  };

  const clearWordTestResults = () => {
    setWordTestResults([]);
  };

  // Clear any errors
  const clearError = () => {
    setError(null);
  };

  return (
    <div className="system-tester">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="system-tester__content">
              
              

              {/* Error Display */}
              {error && (
                <Alert variant="danger" className="mb-4" dismissible onClose={clearError}>
                  {error}
                </Alert>
              )}

              <div className="row g-4">
                {/* Username Testing Tool */}
                <div className="col-md-6">
                  <div className="system-tester__card">
                    <div className="system-tester__card-header">
                      <h4 className="system-tester__card-title">
                        🤖 AI Username Validator
                        <span className="system-tester__card-subtitle">Llama 3</span>
                      </h4>
                      <p className="system-tester__card-description">
                        Test the AI-powered username validation system with real-time feedback
              </p>
            </div>

                    <div className="system-tester__card-body">
                      <div className="d-flex gap-2 mb-3">
                <Form.Control
                  type="text"
                  value={testUsername}
                  onChange={(e) => setTestUsername(e.target.value)}
                  placeholder="Test a username..."
                  disabled={testingUsername}
                  onKeyPress={(e) => e.key === 'Enter' && testUsernameValidation()}
                />
                <Button 
                  onClick={testUsernameValidation} 
                  disabled={testingUsername || !testUsername.trim()}
                  variant="outline-primary"
                >
                          {testingUsername ? "Testing..." : "Test"}
                </Button>
              </div>
              
              {/* Test Results */}
              {usernameTestResults.length > 0 && (
                        <div className="system-tester__results">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fw-bold">Recent Tests ({usernameTestResults.length})</span>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={clearUsernameTestResults}
                    >
                      Clear
                    </Button>
                  </div>
                          <div className="system-tester__results-list">
                    {usernameTestResults.slice(0, 5).map((result, index) => (
                      <div
                        key={index}
                                className={`system-tester__result ${
                                  result.status === 'approved' ? 'system-tester__result--approved' : 'system-tester__result--rejected'
                        }`}
                      >
                                <div className="system-tester__result-header">
                                  <strong>{result.username}</strong>
                                  <span className={`system-tester__result-status ${
                                    result.status === 'approved' ? 'text-success' : 'text-danger'
                                  }`}>
                                    {result.status === 'approved' ? '✅ Approved' : '❌ Rejected'} 
                                    {result.usedAI ? ' (AI)' : ' (Fallback)'}
                                  </span>
                          </div>
                                
                                {result.status === 'rejected' && (
                                  <>
                                  {result.alternateName && (
                                      <div className="system-tester__result-alternate">
                                        <span className="text-muted">Suggested: </span>
                                        <strong>"{result.alternateName}"</strong>
                                      </div>
                                  )}
                                {result.aiGeneratedReason && (
                                      <div className="system-tester__result-reason">
                                        <div className="text-muted fw-semibold">🤖 AI Reasoning:</div>
                                        <div className="fst-italic">"{result.aiGeneratedReason}"</div>
                                    </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      </div>
                  </div>
            </div>

            {/* Word Management Testing Tool */}
                <div className="col-md-6">
                  <div className="system-tester__card">
                    <div className="system-tester__card-header">
                      <h4 className="system-tester__card-title">
                📝 Word Management Tester
                        <span className="system-tester__card-subtitle">DynamoDB</span>
                      </h4>
                      <p className="system-tester__card-description">
                        Test dynamic word loading, seeding, and game creation functionality
                      </p>
                    </div>
                    
                    <div className="system-tester__card-body">
                      <div className="d-flex flex-column gap-2 mb-3">
                <Button 
                  onClick={testWordCategories} 
                  disabled={wordTesting}
                  variant="outline-info"
                >
                          {wordTesting ? "Testing..." : "📂 Test Load Categories"}
                </Button>
                
                <Button 
                  onClick={testSeedCategories} 
                  disabled={wordTesting}
                  variant="outline-success"
                >
                          {wordTesting ? "Testing..." : "🌱 Test Seed Defaults"}
                </Button>
                
                <Button 
                  onClick={testGameCreation} 
                  disabled={wordTesting}
                  variant="outline-primary"
                >
                          {wordTesting ? "Testing..." : "🎲 Test Game Creation"}
                </Button>
              </div>
              
              {/* Word Test Results */}
              {wordTestResults.length > 0 && (
                        <div className="system-tester__results">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fw-bold">Test Results ({wordTestResults.length})</span>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={clearWordTestResults}
                    >
                      Clear
                    </Button>
                  </div>
                          <div className="system-tester__results-list">
                    {wordTestResults.slice(0, 3).map((result, index) => (
                      <div
                        key={index}
                                className={`system-tester__result ${
                                  result.status === 'success' ? 'system-tester__result--approved' : 'system-tester__result--rejected'
                        }`}
                      >
                                <div className="system-tester__result-header">
                                  <strong>{result.test}</strong>
                                  <span className={`system-tester__result-status ${
                                    result.status === 'success' ? 'text-success' : 'text-danger'
                                  }`}>
                              {result.status === 'success' ? '✅' : '❌'} {result.message}
                            </span>
                                </div>
                                {result.data && (
                                  <div className="system-tester__result-data">
                                    <div className="text-muted fw-semibold">📊 Data:</div>
                                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                              </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
