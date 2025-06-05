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
            backgroundColor: "#FCD34D", 
            borderBottom: "3px solid #F59E0B"
          }}
        >
          <LinkContainer to="/">
            <Navbar.Brand className="d-flex align-items-center">
              <img 
                src="/bee.png" 
                alt="Buzzword Bingo" 
                height="40" 
                className="me-2"
              />
              <span 
                className="fw-bold"
                style={{ 
                  color: "#1F2937",
                  fontSize: "1.5rem",
                  fontWeight: "700"
                }}
              >
                Buzzword Bingo
              </span>
            </Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle 
            aria-controls="basic-navbar-nav"
            style={{ borderColor: "#1F2937" }}
          />
          <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
            <Nav>
              <LinkContainer to="/status">
                <Nav.Link 
                  className="fw-semibold me-2"
                  style={{ color: "#1F2937" }}
                >
                  📊 Status Board
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/bingo-test">
                <Nav.Link 
                  className="fw-semibold me-2"
                  style={{ color: "#1F2937" }}
                >
                  🔧 Test Interface
                </Nav.Link>
              </LinkContainer>
              {isAuthenticated ? (
                <>
                  <LinkContainer to="/admin">
                    <Nav.Link 
                      className="fw-semibold me-2"
                      style={{ color: "#1F2937" }}
                    >
                      ⚙️ Admin
                    </Nav.Link>
                  </LinkContainer>
                  <LinkContainer to="/settings">
                    <Nav.Link 
                      className="fw-semibold me-2"
                      style={{ color: "#1F2937" }}
                    >
                      Settings
                    </Nav.Link>
                  </LinkContainer>
                  <Nav.Link 
                    onClick={handleLogout}
                    className="fw-semibold"
                    style={{ color: "#1F2937" }}
                  >
                    Logout
                  </Nav.Link>
                </>
              ) : (
                <>
                  <LinkContainer to="/login">
                    <Nav.Link 
                      className="fw-semibold"
                      style={{ color: "#1F2937" }}
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
