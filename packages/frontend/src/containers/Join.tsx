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
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ 
          background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)"
        }}
      >
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" style={{ width: "3rem", height: "3rem" }}></div>
          <h5 style={{ color: "#1F2937" }}>Checking your session...</h5>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-vh-100 d-flex align-items-center"
      style={{ 
        background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)"
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card 
              className="shadow-lg border-0 text-center"
              style={{ borderRadius: "20px" }}
            >
              <Card.Body className="p-4 p-sm-5">
                {/* Bee Logo */}
                <div className="mb-4">
                  <img 
                    src="/bee.png" 
                    alt="Buzzword Bingo Bee" 
                    className="img-fluid"
                    style={{ maxHeight: "80px" }}
                  />
                </div>
                
                {/* Title */}
                <h1 
                  className="h2 fw-bold mb-4"
                  style={{ color: "#1F2937" }}
                >
                  JOIN BUZZWORD BINGO @ LIVE!
                </h1>
                
                {/* Join Form */}
                <Form onSubmit={handleJoin}>
                  <Form.Group className="mb-4">

                    <Form.Control
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter a nickname"
                      size="lg"
                      maxLength={20}
                      className="text-center fw-semibold"
                      style={{ 
                        borderColor: "#F59E0B",
                        borderWidth: "2px",
                        fontSize: "1.25rem"
                      }}
                      disabled={loading}
                    />
                    <Form.Text className="text-muted">
                      Max 20 characters
                    </Form.Text>
                  </Form.Group>
                  
                  {error && (
                    <Alert variant="danger" className="mb-4">
                      {error}
                    </Alert>
                  )}
                  
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading || !nickname.trim()}
                    className="w-100 fw-bold py-3"
                    style={{ 
                      backgroundColor: "#F59E0B", 
                      borderColor: "#F59E0B",
                      fontSize: "1.25rem",
                      borderRadius: "12px"
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Joining...
                      </>
                    ) : (
                      "JOIN"
                    )}
                  </Button>
                </Form>
                
                {/* Info */}
                <div className="mt-4 pt-3 border-top">
                  <small className="text-muted">
                    🎯 Listen for buzzwords during the presentation<br/>
                    🏆 Get 5 in a row to win BINGO!
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
} 