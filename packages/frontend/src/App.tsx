import { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import Nav from "react-bootstrap/Nav";
import { onError } from "./lib/errorLib";
import Navbar from "react-bootstrap/Navbar";
import { useNavigate } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import { AppContext, AppContextType } from "./lib/contextLib";
import Routes from "./Routes.tsx";
import "./App.css";

function App() {
  const nav = useNavigate();

  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isAuthenticated, userHasAuthenticated] = useState(false);

  useEffect(() => {
    onLoad();
  }, []);

  async function onLoad() {
    try {
      await Auth.currentSession();
      userHasAuthenticated(true);
    } catch (error) {
      if (error !== "No current user") {
        onError(error);
      }
    }

    setIsAuthenticating(false);
  }

  async function handleLogout() {
    await Auth.signOut();

    userHasAuthenticated(false);

    nav("/login");
  }

  return (
    !isAuthenticating && (
      <div className="App">
        <Navbar 
          collapseOnSelect 
          expand="lg" 
          className="mb-0 px-3 shadow-sm"
          style={{ 
            backgroundColor: "#ffffff", 
            borderBottom: "1px solid #e2e8f0",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
          }}
        >
          <LinkContainer to="/">
            <Navbar.Brand className="d-flex align-items-center">
              <img 
                src="/corp-dude.png" 
                alt="Corporate Buzzword Bingo" 
                height="32" 
                className="me-2"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))" }}
              />
              <span 
                className="fw-bold"
                style={{ 
                  color: "#1e293b",
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  letterSpacing: "-0.025em"
                }}
              >
                Buzzword Bingo
              </span>
            </Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle 
            aria-controls="basic-navbar-nav"
            style={{ borderColor: "#e2e8f0" }}
          />
          <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
            <Nav>
              <LinkContainer to="/status">
                <Nav.Link 
                  className="fw-semibold me-2"
                  style={{ 
                    color: "#64748b",
                    fontSize: "0.875rem",
                    fontWeight: "600"
                  }}
                >
                  📊 Dashboard
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/bingo-test">
                <Nav.Link 
                  className="fw-semibold me-2"
                  style={{ 
                    color: "#64748b",
                    fontSize: "0.875rem",
                    fontWeight: "600"
                  }}
                >
                  🔧 Test Suite
                </Nav.Link>
              </LinkContainer>
              {isAuthenticated ? (
                <>
                  <LinkContainer to="/admin">
                    <Nav.Link 
                      className="fw-semibold me-2"
                      style={{ 
                        color: "#64748b",
                        fontSize: "0.875rem",
                        fontWeight: "600"
                      }}
                    >
                      ⚙️ Administration
                    </Nav.Link>
                  </LinkContainer>
                  <LinkContainer to="/settings">
                    <Nav.Link 
                      className="fw-semibold me-2"
                      style={{ 
                        color: "#64748b",
                        fontSize: "0.875rem",
                        fontWeight: "600"
                      }}
                    >
                      Settings
                    </Nav.Link>
                  </LinkContainer>
                  <Nav.Link 
                    onClick={handleLogout}
                    className="fw-semibold"
                    style={{ 
                      color: "#64748b",
                      fontSize: "0.875rem",
                      fontWeight: "600"
                    }}
                  >
                    Logout
                  </Nav.Link>
                </>
              ) : (
                <>
                  <LinkContainer to="/login">
                    <Nav.Link 
                      className="fw-semibold"
                      style={{ 
                        color: "#64748b",
                        fontSize: "0.875rem",
                        fontWeight: "600"
                      }}
                    >
                      Login
                    </Nav.Link>
                  </LinkContainer>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <AppContext.Provider
          value={{ isAuthenticated, userHasAuthenticated } as AppContextType}
        >
          <Routes />
        </AppContext.Provider>
      </div>
    )
  );
}

export default App;
