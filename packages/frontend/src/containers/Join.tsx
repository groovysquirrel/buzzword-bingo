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
import "./Join.css";

interface JoinGameResponse {
  sessionId: string;
  signedToken: string;
  nickname: string;
  currentGameId: string;
}

interface ExistingSession {
  sessionId: string;
  signedToken: string;
  nickname: string;
  currentGameId: string;
  joinedAt: string;
}

export default function Join() {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session on component mount
    checkExistingSession();
  }, []);

  const checkExistingSession = () => {
    try {
      const sessionData = localStorage.getItem("buzzword-bingo-session");
      if (sessionData) {
        const session: ExistingSession = JSON.parse(sessionData);
        
        // Validate that the session has all required fields
        if (session.sessionId && session.signedToken && session.nickname && session.currentGameId) {
          console.log("Found existing session for:", session.nickname);
          // Redirect to game immediately
          navigate("/play");
          return;
        } else {
          // Invalid session data, clear it
          localStorage.removeItem("buzzword-bingo-session");
        }
      }
    } catch (error) {
      console.error("Error checking existing session:", error);
      // Clear invalid session data
      localStorage.removeItem("buzzword-bingo-session");
    }
    
    // No valid session found, show join form
    setCheckingSession(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }

    if (nickname.length > 20) {
      setError("Nickname must be 20 characters or less");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result: JoinGameResponse = await API.post("api", "/join", {
        body: { nickname: nickname.trim() }
      });
      
      // Store session info in localStorage
      localStorage.setItem("buzzword-bingo-session", JSON.stringify({
        sessionId: result.sessionId,
        signedToken: result.signedToken,
        nickname: result.nickname,
        currentGameId: result.currentGameId,
        joinedAt: new Date().toISOString()
      }));
      
      // Navigate to the game
      navigate("/play");
    } catch (error: any) {
      console.error("Join game error:", error);
      setError(error.response?.data?.message || "Failed to join game. Please try again.");
    }

    setLoading(false);
  };

  // Show loading while checking for existing session
  if (checkingSession) {
    return (
      <div className="join-container">
        <div className="join-loading">
          <div className="spinner-border text-warning"></div>
          <h5>Checking your session...</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="join-container">
      <Container fluid className="h-100 d-flex align-items-center justify-content-center">
        <Row className="justify-content-center w-100">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="join-card">
              <Card.Body className="join-card-body">
                {/* Bee Logo */}
                <div className="mb-3">
                  <img 
                    src="/buzzword_bingo_image.png" 
                    alt="Buzzword Bingo Logo" 
                    className="join-bee-logo img-fluid"
                  />
                </div>

                {/* Join Form */}
                <Form onSubmit={handleJoin}>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter your name to join"
                      size="lg"
                      maxLength={20}
                      className="join-form-control"
                      disabled={loading}
                    />
                    <Form.Text className="text-muted mt-2">
                      Max 20 characters
                    </Form.Text>
                  </Form.Group>
                  
                  {error && (
                    <Alert variant="danger" className="mb-3">
                      {error}
                    </Alert>
                  )}
                  
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading || !nickname.trim()}
                    className="join-button w-100"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Joining Game...
                      </>
                    ) : (
                      "JOIN THE GAME"
                    )}
                  </Button>
                </Form>
                
                {/* Professional Info */}
                <div className="join-info-section">
                  <p className="join-info-text">
                    <span className="emoji">🎯</span>Listen for buzzwords<br/>
                    <span className="emoji">⚡</span>Compete in real-time<br/>
                    <span className="emoji">🏆</span>Claim your prize!
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
} 