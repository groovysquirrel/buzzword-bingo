import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "aws-amplify";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Modal from "react-bootstrap/Modal";
import "./Settings.css";

interface SessionInfo {
  sessionId: string;
  signedToken: string;
  nickname: string;
  currentGameId: string;
  joinedAt: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [newNickname, setNewNickname] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = () => {
    try {
      const sessionData = localStorage.getItem('buzzword-bingo-session');
      if (sessionData) {
        const parsedSession: SessionInfo = JSON.parse(sessionData);
        setSession(parsedSession);
        setNewNickname(parsedSession.nickname);
      }
    } catch (error) {
      console.error('Failed to parse session data:', error);
    }
  };

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      setUpdateError("No active session found. Please join a game first.");
      return;
    }

    if (!newNickname.trim()) {
      setUpdateError("Please enter a nickname");
      return;
    }

    if (newNickname.length > 20) {
      setUpdateError("Nickname must be 20 characters or less");
      return;
    }

    if (newNickname.trim() === session.nickname) {
      setUpdateError("This is already your current nickname");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const result = await API.post("api", "/profile/update", {
        body: { nickname: newNickname.trim() },
        headers: {
          Authorization: `Bearer ${session.signedToken}`
        }
      });

      // Update local session with new nickname and fresh token
      const updatedSession = {
        ...session,
        nickname: newNickname.trim(),
        signedToken: result.newSignedToken // Use the new token with updated nickname
      };
      
      setSession(updatedSession);
      localStorage.setItem('buzzword-bingo-session', JSON.stringify(updatedSession));
      
      setUpdateSuccess(`Nickname successfully updated to "${newNickname.trim()}"!`);
      
    } catch (error: any) {
      console.error("Update nickname error:", error);
      setUpdateError(error.response?.data?.message || "Failed to update nickname. Please try again.");
    }

    setIsUpdating(false);
  };

  const handleClearLocalStorage = () => {
    // Clear all local storage items related to the app
    localStorage.removeItem('buzzword-bingo-session');
    localStorage.removeItem('buzzword-bingo-public-token');
    localStorage.removeItem('buzzword-bingo-device-id');
    
    // Reset component state
    setSession(null);
    setNewNickname("");
    setUpdateError(null);
    setUpdateSuccess(null);
    setShowClearModal(false);
    
    // Redirect to home page
    navigate("/");
  };

  return (
    <div className="Settings">
      <Container className="py-4">
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <Card className="shadow-sm">
              <Card.Header 
                className="text-white text-center"
                style={{ 
                  background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                }}
              >
                <h3 className="mb-0">⚙️ Settings</h3>
              </Card.Header>
              <Card.Body className="p-4">
                {session ? (
                  <>
                    {/* Current Session Info */}
                    <div className="mb-4">
                      <h5 className="text-muted mb-3">Current Session</h5>
                      <div className="bg-light p-3 rounded">
                        <div className="mb-2">
                          <strong>Display Name:</strong> {session.nickname}
                        </div>
                        <div>
                          <strong>Joined:</strong> {new Date(session.joinedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Update Nickname Form */}
                    <div className="mb-4">
                      <h5 className="text-muted mb-3">Change Display Name</h5>
                      <Form onSubmit={handleNicknameSubmit}>
                        <Form.Group className="mb-3">
                          <Form.Label>New Display Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={newNickname}
                            onChange={(e) => setNewNickname(e.target.value)}
                            placeholder="Enter your new display name"
                            maxLength={20}
                            disabled={isUpdating}
                          />
                          <Form.Text className="text-muted">
                            Your display name will be updated on the leaderboard and throughout the app.
                          </Form.Text>
                        </Form.Group>
                        
                        {updateError && (
                          <Alert variant="danger" className="mb-3">
                            {updateError}
                          </Alert>
                        )}
                        
                        {updateSuccess && (
                          <Alert variant="success" className="mb-3">
                            {updateSuccess}
                          </Alert>
                        )}
                        
                        <Button 
                          type="submit" 
                          variant="primary"
                          disabled={isUpdating || !newNickname.trim() || newNickname.trim() === session.nickname}
                          className="w-100"
                        >
                          {isUpdating ? "Updating..." : "Update Display Name"}
                        </Button>
                      </Form>
                    </div>
                  </>
                ) : (
                  <Alert variant="info" className="mb-4">
                    <Alert.Heading>No Active Session</Alert.Heading>
                    <p>You don't have an active game session. Join a game to access nickname settings.</p>
                    <Button variant="primary" onClick={() => navigate("/")}>
                      Join Game
                    </Button>
                  </Alert>
                )}

                {/* Clear Local Storage */}
                <div className="border-top pt-4">
                  <h5 className="text-muted mb-3">Reset Environment</h5>
                  <p className="text-muted mb-3">
                    Clear all stored session data and reset your local environment. 
                    This will log you out and you'll need to rejoin the game with a new nickname. You will lose any association with your previous nickname.
                  </p>
                  <Button 
                    variant="outline-danger"
                    onClick={() => setShowClearModal(true)}
                    className="w-100"
                  >
                    🗑️ Clear Local Storage
                  </Button>
      </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Clear Storage Confirmation Modal */}
      <Modal show={showClearModal} onHide={() => setShowClearModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Clear Local Storage</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            This will clear all your stored session data including:
          </p>
          <ul>
            <li>Current game session</li>
            <li>Display name preferences</li>
            <li>Device settings</li>
          </ul>
          <p className="text-danger mb-0">
            <strong>You will be logged out and need to rejoin the game.</strong>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClearModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleClearLocalStorage}>
            Clear & Reset
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
