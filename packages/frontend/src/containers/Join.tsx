/**
 * ============================================
 * JOIN COMPONENT - Corporate Buzzword Bingo
 * ============================================
 * 
 * PURPOSE:
 * User registration/authentication interface for the buzzword bingo game.
 * Handles new user registration, existing session validation, and AI-powered
 * username moderation with a professional corporate aesthetic.
 * 
 * FEATURES:
 * - Session validation and restoration
 * - AI-powered username validation with graceful fallbacks
 * - Professional error handling with user-friendly modals
 * - Responsive design optimized for all devices
 * - System reset detection and localStorage management
 * 
 * STATE MANAGEMENT:
 * - nickname: Current input value
 * - loading: Button/form loading state
 * - error: Generic error messages
 * - checkingSession: Initial session validation state
 * - aiRejection: AI moderation results with suggested alternatives
 * - acceptingSuggestion: Loading state for accepting AI suggestions
 * 
 * FLOW:
 * 1. Component mounts → Check existing session
 * 2. If valid session exists → Redirect to game
 * 3. If no session → Show registration form
 * 4. User submits → Validate with AI → Join game or show modal
 * 5. AI rejection → Show modal with suggestion or try different name
 * 
 * ERROR HANDLING:
 * - Network errors: Generic error alerts
 * - System reset: Clear localStorage + helpful message
 * - AI rejection: Professional modal with alternatives
 * - Validation errors: Structured responses
 * 
 * DEPENDENCIES:
 * - AWS Amplify API for backend communication
 * - React Router for navigation
 * - React Bootstrap for UI components
 * - Custom hooks for session management
 */

import { useState, useEffect } from "react";
import { API } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import Modal from "react-bootstrap/Modal";
import { clearAllLocalStorage } from "../hooks/useGameSession";
import "./Join.css";

/* ============================================
   TYPE DEFINITIONS
   ============================================ */

/**
 * Response structure from successful join API call
 */
interface JoinGameResponse {
  sessionId: string;
  signedToken: string;
  nickname: string;
  currentGameId: string;
}

/**
 * Structure of existing session data stored in localStorage
 */
interface ExistingSession {
  sessionId: string;
  signedToken: string;
  nickname: string;
  currentGameId: string;
  joinedAt: string;
}

/**
 * AI rejection data with suggested alternative
 * Used to populate the professional rejection modal
 */
interface AIRejection {
  originalName: string;
  suggestedName: string;
  reason: string;
}

/* ============================================
   MAIN COMPONENT
   ============================================ */

export default function Join() {
  /* === STATE MANAGEMENT === */
  
  // Form state
  const [nickname, setNickname] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Session validation state
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  
  // AI moderation state
  const [aiRejection, setAiRejection] = useState<AIRejection | null>(null);
  const [acceptingSuggestion, setAcceptingSuggestion] = useState<boolean>(false);
  
  // Navigation
  const navigate = useNavigate();

  /* === INITIALIZATION === */
  
  /**
   * Component initialization
   * Immediately check for existing valid sessions on mount
   */
  useEffect(() => {
    checkExistingSession();
  }, []);

  /* ============================================
     SESSION MANAGEMENT FUNCTIONS
     ============================================ */

  /**
   * Check for existing valid session
   * 
   * FLOW:
   * 1. Read session data from localStorage
   * 2. Validate session structure and completeness
   * 3. Verify current game exists on backend
   * 4. Either redirect to game or show join form
   * 
   * HANDLES:
   * - Invalid/corrupted session data
   * - System resets (no active games)
   * - Network errors during validation
   */
  const checkExistingSession = async (): Promise<void> => {
    try {
      // Attempt to retrieve session from localStorage
      const sessionData = localStorage.getItem("buzzword-bingo-session");
      if (sessionData) {
        const session: ExistingSession = JSON.parse(sessionData);
        
        // Validate session completeness - all fields must be present
        if (session.sessionId && session.signedToken && session.nickname && session.currentGameId) {
          console.log("Found existing session for:", session.nickname);
          
          // Validate that the stored game still exists by checking backend
          try {
            const currentGameResult = await API.get("api", "/current-game", {});
            
            if (!currentGameResult.currentGameId) {
              // No active games exist - likely system reset scenario
              console.log("🚨 No active games found - system may have been reset, clearing session");
              clearAllLocalStorage();
              
              // Show user-friendly message about system reset
              setError("The system appears to have been reset. Please register again once a new game is created.");
              setCheckingSession(false);
              return;
            }
            
            // Valid session and active game found - proceed to game
            // Note: Game component will handle game ID mismatches if needed
            console.log("Session validated - redirecting to game");
            navigate("/play");
            return;
            
          } catch (gameCheckError) {
            // Error checking game status - let game component handle it
            console.error("Error checking current game:", gameCheckError);
            navigate("/play");
            return;
          }
        } else {
          // Session data incomplete - remove invalid session
          localStorage.removeItem("buzzword-bingo-session");
        }
      }
    } catch (error) {
      // Error parsing session data - clear corrupted data
      console.error("Error checking existing session:", error);
      localStorage.removeItem("buzzword-bingo-session");
    }
    
    // No valid session found - show join form
    setCheckingSession(false);
  };

  /* ============================================
     USER REGISTRATION FUNCTIONS
     ============================================ */

  /**
   * Handle main join form submission
   * 
   * VALIDATION:
   * - Client-side: empty nickname, length limits
   * - Server-side: AI appropriateness, uniqueness, profanity
   * 
   * RESPONSES:
   * - Success: Store session and redirect to game
   * - AI rejection: Show professional modal with alternative
   * - System reset: Clear localStorage and show message
   * - Other errors: Display generic error alert
   */
  const handleJoin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Client-side validation
    if (!nickname.trim()) {
      setError("Please enter your name");
      return;
    }

    if (nickname.length > 20) {
      setError("Name must be 20 characters or less");
      return;
    }

    // Begin join process
    setLoading(true);
    setError(null);

    try {
      // Submit to backend for comprehensive validation and registration
      const result: JoinGameResponse = await API.post("api", "/join", {
        body: { nickname: nickname.trim() }
      });
      
      // Store successful session in localStorage
      localStorage.setItem("buzzword-bingo-session", JSON.stringify({
        sessionId: result.sessionId,
        signedToken: result.signedToken,
        nickname: result.nickname,
        currentGameId: result.currentGameId,
        joinedAt: new Date().toISOString()
      }));
      
      // Navigate to game
      navigate("/play");
      
    } catch (error: any) {
      console.error("Join game error:", error);
      
      // Handle different error scenarios
      if (error.response?.status === 404 && error.response?.data?.error === "NO_ACTIVE_GAMES") {
        // System reset scenario - no active games exist
        const errorData = error.response.data;
        
        if (errorData.clearLocalStorage || errorData.systemReset) {
          console.log("🧹 System reset detected - clearing localStorage");
          clearAllLocalStorage();
        }
        
        setError(errorData.userMessage || "The system appears to have been reset. Please try joining again once a new game is created.");
        
      } else {
        // Check for AI rejection with suggested alternative
        const errorMessage = error.response?.data?.message || "";
        if (errorMessage.includes("Username not appropriate") && errorMessage.includes("Try:")) {
          // Extract AI suggestion from error message format: 'Try: "suggestion"'
          const match = errorMessage.match(/Try: "([^"]+)"/);
          const aiReason = error.response?.data?.aiGeneratedReason;
          
          if (match && match[1]) {
            setAiRejection({
              originalName: nickname.trim(),
              suggestedName: match[1],
              reason: aiReason || "The AI moderator determined this name isn't appropriate in a professional context."
            });
            return; // Show modal instead of generic error
          }
        }
        
        // Generic error handling for other validation failures
        setError(error.response?.data?.message || "Failed to join the session. Please try again.");
      }
    }

    setLoading(false);
  };

  /* ============================================
     AI REJECTION MODAL FUNCTIONS
     ============================================ */

  /**
   * Handle accepting AI's suggested username
   * 
   * PROCESS:
   * 1. Submit AI suggestion to backend
   * 2. Store session on success
   * 3. Navigate to game
   * 4. Handle any errors gracefully
   */
  const handleAcceptAISuggestion = async (): Promise<void> => {
    if (!aiRejection) return;
    
    setAcceptingSuggestion(true);
    
    try {
      // Submit AI's suggested username
      const result: JoinGameResponse = await API.post("api", "/join", {
        body: { nickname: aiRejection.suggestedName }
      });
      
      // Store successful session
      localStorage.setItem("buzzword-bingo-session", JSON.stringify({
        sessionId: result.sessionId,
        signedToken: result.signedToken,
        nickname: result.nickname,
        currentGameId: result.currentGameId,
        joinedAt: new Date().toISOString()
      }));
      
      // Navigate to game
      navigate("/play");
      
    } catch (error: any) {
      console.error("Join with AI suggestion error:", error);
      setAiRejection(null);
      setError("Failed to join with suggested name. Please try a different name.");
    }
    
    setAcceptingSuggestion(false);
  };

  /**
   * Handle dismissing AI rejection modal
   * 
   * ACTIONS:
   * - Clear AI rejection state
   * - Reset form input field
   * - Reset loading state to allow new attempts
   */
  const handleDismissAIRejection = (): void => {
    setAiRejection(null);
    setNickname(""); // Clear rejected nickname
    setLoading(false); // Reset loading state for new attempts
  };

  /* ============================================
     RENDER LOGIC
     ============================================ */

  /**
   * Loading screen during session validation
   * Shown immediately on component mount while checking existing sessions
   */
  if (checkingSession) {
    return (
      <div className="join-container">
        <div className="join-loading">
          <div className="spinner-border"></div>
          <h5>Checking your session...</h5>
        </div>
      </div>
    );
  }

  /**
   * Main registration interface
   * Professional corporate design with satirical elements
   */
  return (
    <div className="join-container">
      <Container fluid className="h-100 d-flex align-items-center justify-content-center">
        <Row className="justify-content-center w-100">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            
            {/* === MAIN REGISTRATION CARD === */}
            <Card className="join-card">
              <Card.Body className="join-card-body">
                
                {/* Corporate Branding */}
                <div className="mb-4">
                  <img 
                    src="/buzzword_bingo_image2.png" 
                    alt="Corporate Buzzword Bingo - Professional Assessment Tool" 
                    className="join-bee-logo img-fluid"
                  />
                </div>
                
                {/* Registration Form */}
                <Form onSubmit={handleJoin} className="join-form">
                  <div className="join-form-group">
                    <label className="join-form-label">
                      Corporate Identity
                    </label>
                    <Form.Control
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter your corporate display name"
                      maxLength={20}
                      className="join-form-control"
                      disabled={loading}
                    />
                    <div className="join-form-text">
                      Names are moderated by a disdainful AI. 20 charaters max. 
                    </div>
                  </div>
                  
                  {/* Error Alert Display */}
                  {error && (
                    <Alert variant="danger" className="border-0 bg-danger bg-opacity-10 border-start border-danger border-4 rounded-0 rounded-end">
                      <div className="d-flex align-items-start">
                        <span className="text-danger me-2 mt-1">⚠️</span>
                        <div className="text-danger fw-medium lh-base mb-0">{error}</div>
                      </div>
                    </Alert>
                  )}
                  
                  {/* Primary Action Button */}
                  <Button
                    type="submit"
                    disabled={loading || !nickname.trim()}
                    className="join-button"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Initializing Session...
                      </>
                    ) : (
                      "Access Platform"
                    )}
                  </Button>
                </Form>
                
                {/* Corporate Features List */}
                <div className="join-features">
                  <div className="join-feature">
                    <div className="join-feature-icon"></div>
                    Real-time buzzword tracking and analysis
                  </div>
                  <div className="join-feature">
                    <div className="join-feature-icon"></div>
                    Advanced corporate jargon recognition
                  </div>
                  <div className="join-feature">
                    <div className="join-feature-icon"></div>
                    Competitive workplace engagement metrics
                  </div>
                </div>
                
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* ============================================
          AI REJECTION MODAL
          ============================================
          Professional modal for handling AI username rejections
          Shows original submission, reason, and suggested alternative */}
      <Modal show={!!aiRejection} onHide={handleDismissAIRejection} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 mb-0">
            <span className="me-2">🤖</span>
            AI Moderator Alert
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          {aiRejection && (
            <>
              {/* Rejection Header */}
              <div className="text-center mb-4">
                
                <h4 className="fw-bold text-dark mb-0">❌ Username Not Approved</h4>
              </div>
              
              {/* Original Submission Card */}
              <Card className="border-danger border-opacity-25 mb-3">
                <Card.Body className="bg-danger bg-opacity-10 py-3">
                  <div className="small text-muted mb-1 fw-semibold">Your submission:</div>
                  <div className="h6 text-danger fw-bold mb-0">"{aiRejection.originalName}"</div>
                </Card.Body>
              </Card>
              
              {/* Rejection Reason */}
              <Alert variant="light" className="border-0 bg-light mb-3">
                <div className="text-muted mb-0 lh-base">
                  <strong>AI Comments:</strong> {aiRejection.reason}
                </div>
              </Alert>
              
              {/* AI Suggestion Card */}
              <Card className="border-success border-opacity-25 mb-3">
                <Card.Body className="bg-success bg-opacity-10 py-3">
                  <div className="small text-muted mb-1 fw-semibold">AI suggests instead:</div>
                  <div className="h6 text-success fw-bold mb-0">"{aiRejection.suggestedName}"</div>
                </Card.Body>
              </Card>
              
              {/* Helpful Context */}
              <Alert variant="info" className="border-0 bg-info bg-opacity-10 mb-0">
                <div className="small text-muted mb-0 d-flex align-items-center">
                  <span className="me-2">💡</span>
                  <span>Our AI moderator helps maintain a professional environment for all players.</span>
                </div>
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 gap-2">
          {/* Option 1: Try Different Name */}
          <Button 
            variant="outline-secondary" 
            onClick={handleDismissAIRejection}
            className="flex-fill"
          >
            <span className="fw-semibold">Try Different Name</span>
          </Button>
          
          {/* Option 2: Accept AI Suggestion */}
          <Button 
            variant="success" 
            onClick={handleAcceptAISuggestion}
            disabled={acceptingSuggestion}
            className="flex-fill"
          >
            {acceptingSuggestion ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                <span className="fw-semibold">Continuing...</span>
              </>
            ) : (
              <span className="fw-semibold">Continue as "{aiRejection?.suggestedName}"</span>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
} 