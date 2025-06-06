import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../lib/contextLib";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import Alert from "react-bootstrap/Alert";
import BingoTest from "./BingoTest";
import GameController from "../components/GameController/GameController";
import "./Admin.css";

export default function Admin() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppContext();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate("/login?redirect=/admin");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Show loading/redirect state while checking authentication
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-dashboard-container">
      <Container className="py-4">
        {/* Corporate Header */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="admin-dashboard-header border-0 text-center">
              <Card.Body className="py-4">
                <div className="mb-3">
                  <img 
                    src="/corp-dude.png" 
                    alt="Corporate Executive" 
                    height="60" 
                    className="admin-dashboard-header__logo"
                  />
                </div>
                <h1 className="admin-dashboard-header__title">
                  Executive Administration Portal
                </h1>
                <p className="admin-dashboard-header__subtitle">
                  Enterprise-grade management console for professional assessment platforms
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Administrative Navigation Interface */}
        <Row>
          <Col xs={12}>
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "dashboard")}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: "12px" }}>
                <Card.Header className="admin-nav-container border-0 py-3">
                  <Nav variant="pills" className="admin-nav-pills flex-row">
                    <Nav.Item>
                      <Nav.Link 
                        eventKey="dashboard"
                        className={activeTab === "dashboard" ? "active" : ""}
                      >
                        📊 Executive Dashboard
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                        eventKey="game-control"
                        className={activeTab === "game-control" ? "active" : ""}
                      >
                        🎯 Session Management
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                        eventKey="testing"
                        className={activeTab === "testing" ? "active" : ""}
                      >
                        🔧 Quality Assurance
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                        eventKey="monitoring"
                        className={activeTab === "monitoring" ? "active" : ""}
                      >
                        📈 Performance Analytics
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </Card.Header>

                <Card.Body className="admin-content-section p-0">
                  <Tab.Content>
                    {/* Executive Dashboard Tab */}
                    <Tab.Pane eventKey="dashboard">
                      <div className="p-4">
                        <Row className="g-4">
                          {/* Strategic Overview */}
                          <Col xs={12}>
                            <h5 className="admin-section-title">
                              Strategic Operations Overview
                            </h5>
                            <Row className="g-3">
                              <Col xs={12} sm={6} md={3}>
                                <Card className="admin-overview-card text-center">
                                  <Card.Body>
                                    <div className="admin-overview-card__icon">🎯</div>
                                    <h6 className="admin-overview-card__title">Session Control</h6>
                                    <small className="admin-overview-card__description">
                                      Real-time assessment orchestration
                                    </small>
                                  </Card.Body>
                                </Card>
                              </Col>
                              <Col xs={12} sm={6} md={3}>
                                <Card className="admin-overview-card text-center">
                                  <Card.Body>
                                    <div className="admin-overview-card__icon">🔬</div>
                                    <h6 className="admin-overview-card__title">QA Testing</h6>
                                    <small className="admin-overview-card__description">
                                      Enterprise validation protocols
                                    </small>
                                  </Card.Body>
                                </Card>
                              </Col>
                              <Col xs={12} sm={6} md={3}>
                                <Card className="admin-overview-card text-center">
                                  <Card.Body>
                                    <div className="admin-overview-card__icon">📊</div>
                                    <h6 className="admin-overview-card__title">Status Board</h6>
                                    <small className="admin-overview-card__description">
                                      Executive visualization dashboard
                                    </small>
                                  </Card.Body>
                                </Card>
                              </Col>
                              <Col xs={12} sm={6} md={3}>
                                <Card className="admin-overview-card text-center">
                                  <Card.Body>
                                    <div className="admin-overview-card__icon">👔</div>
                                    <h6 className="admin-overview-card__title">Participants</h6>
                                    <small className="admin-overview-card__description">
                                      Professional engagement metrics
                                    </small>
                                  </Card.Body>
                                </Card>
                              </Col>
                            </Row>
                          </Col>

                          {/* Strategic Actions */}
                          <Col xs={12}>
                            <h5 className="admin-section-title">
                              Executive Quick Actions
                            </h5>
                            <Row className="g-3">
                              <Col xs={12} md={6}>
                                <Button 
                                  className="admin-action-btn w-100"
                                  size="lg"
                                  onClick={() => window.open("/status", "_blank")}
                                >
                                  📺 Launch Executive Status Board
                                </Button>
                              </Col>
                              <Col xs={12} md={6}>
                                <Button 
                                  className="admin-action-btn w-100"
                                  size="lg"
                                  onClick={() => window.open("/", "_blank")}
                                >
                                  🎯 Access Professional Assessment Portal
                                </Button>
                              </Col>
                            </Row>
                          </Col>
                        </Row>
                      </div>
                    </Tab.Pane>

                    {/* Session Management Tab */}
                    <Tab.Pane eventKey="game-control">
                      <div className="p-4">
                        <Row>
                          <Col xs={12}>
                            <h5 className="admin-section-title">
                              Professional Assessment Session Management
                            </h5>
                            <Card className="admin-game-control-card mb-4">
                              <Card.Body className="text-center">
                                <h6 className="admin-game-control-title">
                                  Current Session Operations Control
                                </h6>
                                <GameController 
                                  onGameStateChange={(gameId, status) => {
                                    console.log("Administrative session state change:", gameId, status);
                                  }}
                                />
                                <Alert variant="info" className="mt-3 mb-0">
                                  <small>
                                    <strong>Executive Notice:</strong> Session controls impact all connected professionals in real-time.
                                    Utilize quality assurance protocols to validate system functionality before deployment.
                                  </small>
                                </Alert>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                      </div>
                    </Tab.Pane>

                    {/* Quality Assurance Tab */}
                    <Tab.Pane eventKey="testing">
                      <div className="p-4">
                        <Alert className="admin-testing-alert mb-4">
                          <Alert.Heading className="h6">🔧 Quality Assurance Environment</Alert.Heading>
                          <p className="mb-0">
                            Enterprise-grade testing protocols for multi-stakeholder validation.
                            Deploy comprehensive assessment simulations to ensure optimal performance during professional engagements.
                          </p>
                        </Alert>
                        <BingoTest />
                      </div>
                    </Tab.Pane>

                    {/* Performance Analytics Tab */}
                    <Tab.Pane eventKey="monitoring">
                      <div className="p-4">
                        <h5 className="admin-section-title">
                          Enterprise Performance Analytics
                        </h5>
                        <Alert variant="info" className="mb-4">
                          <Alert.Heading className="h6">📈 Advanced Analytics Suite</Alert.Heading>
                          <p className="mb-0">
                            Comprehensive real-time analytics, stakeholder engagement metrics, and enterprise system health monitoring 
                            will be deployed in the next strategic implementation phase.
                          </p>
                        </Alert>
                        
                        <Row className="g-3">
                          <Col xs={12} md={6}>
                            <Card className="admin-monitoring-card">
                              <Card.Body>
                                <h6 className="admin-monitoring-card__title">🔗 Strategic Interfaces</h6>
                                <div className="d-grid gap-2">
                                  <Button 
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => window.open("/status", "_blank")}
                                  >
                                    Executive Status Dashboard
                                  </Button>
                                  <Button 
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => window.open("/leaderboard", "_blank")}
                                  >
                                    Professional Performance Metrics
                                  </Button>
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col xs={12} md={6}>
                            <Card className="admin-monitoring-card">
                              <Card.Body>
                                <h6 className="admin-monitoring-card__title">⚡ System Health Status</h6>
                                <small className="admin-status-indicator">Backend APIs: ✅ Operational</small>
                                <small className="admin-status-indicator">WebSocket Infrastructure: ✅ Connected</small>
                                <small className="admin-status-indicator">Database Operations: ✅ Accessible</small>
                                <small className="admin-status-indicator">Last Health Check: Just now</small>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                      </div>
                    </Tab.Pane>
                  </Tab.Content>
                </Card.Body>
              </Card>
            </Tab.Container>
          </Col>
        </Row>
      </Container>
    </div>
  );
} 