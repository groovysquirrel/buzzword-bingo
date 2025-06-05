import { useEffect } from "react";
import { LinkContainer } from "react-router-bootstrap";
import { useAppContext } from "../lib/contextLib";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import "./Home.css";

export default function Home() {
  const { isAuthenticated } = useAppContext();

  useEffect(() => {
    async function onLoad() {
      if (!isAuthenticated) {
        return;
      }
    }

    onLoad();
  }, [isAuthenticated]);

  return (
    <div 
      className="min-vh-100 d-flex flex-column"
      style={{ 
        background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)"
      }}
    >
      <Container className="flex-grow-1 d-flex align-items-center py-5">
        <Row className="w-100 justify-content-center">
          <Col xs={12} md={10} lg={8} xl={6}>
            <Card 
              className="shadow-lg border-0 text-center"
              style={{ borderRadius: "20px" }}
            >
              <Card.Body className="p-4 p-md-5">
                {/* Bee Logo */}
                <div className="mb-4">
                  <img 
                    src="/bee.png" 
                    alt="Buzzword Bingo Bee" 
                    className="img-fluid"
                    style={{ maxHeight: "120px" }}
                  />
                </div>
                
                {/* Title */}
                <h1 
                  className="display-4 fw-bold mb-3"
                  style={{ color: "#1F2937" }}
                >
                  Buzzword Bingo
                </h1>
                
                {/* Subtitle */}
                <p 
                  className="lead mb-4"
                  style={{ color: "#374151" }}
                >
                  Conference engagement tool with real-time leaderboards
                </p>
                
                {/* Action Buttons */}
                <Row className="g-3 justify-content-center">
                  <Col xs={12} sm={6} md={5}>
                    <LinkContainer to="/bingo-test">
                      <Button 
                        size="lg" 
                        className="w-100 fw-bold shadow-sm"
                        style={{ 
                          backgroundColor: "#F59E0B", 
                          borderColor: "#F59E0B",
                          color: "white"
                        }}
                      >
                        🎮 Test Game
                      </Button>
                    </LinkContainer>
                  </Col>
                  <Col xs={12} sm={6} md={5}>
                    <LinkContainer to="/status">
                      <Button 
                        variant="outline-dark"
                        size="lg" 
                        className="w-100 fw-bold shadow-sm"
                        style={{ 
                          borderColor: "#1F2937",
                          color: "#1F2937"
                        }}
                      >
                        📊 Status Board
                      </Button>
                    </LinkContainer>
                  </Col>
                </Row>
                
                {/* Features Description */}
                <Row className="mt-4 g-3">
                  <Col xs={12} md={6}>
                    <div className="p-3 rounded" style={{ backgroundColor: "#FEF3C7" }}>
                      <h6 className="fw-bold mb-2" style={{ color: "#1F2937" }}>
                        🎮 Test Interface
                      </h6>
                      <small style={{ color: "#374151" }}>
                        Join as multiple players and test the game mechanics
                      </small>
                    </div>
                  </Col>
                  <Col xs={12} md={6}>
                    <div className="p-3 rounded" style={{ backgroundColor: "#FEF3C7" }}>
                      <h6 className="fw-bold mb-2" style={{ color: "#1F2937" }}>
                        📊 Status Board
                      </h6>
                      <small style={{ color: "#374151" }}>
                        Real-time leaderboard and activity feed for public display
                      </small>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
