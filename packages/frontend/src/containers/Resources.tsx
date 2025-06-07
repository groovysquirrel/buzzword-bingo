/**
 * Project Resources Page Component
 * 
 * This component displays a comprehensive list of developer resources, source code links,
 * documentation, and external references for the Buzzword Bingo application.
 * 
 * PURPOSE:
 * - Provides easy access to GitHub repositories and key files for developers
 * - Serves as a demo-ready resource during conference presentations
 * - Offers external links to technologies and frameworks used in the project
 * - Creates a professional resource hub for open-source contributors
 * 
 * DESIGN SYSTEM:
 * - Uses React Bootstrap components with custom CSS for enhanced styling
 * - Implements a responsive card-based layout with perfect vertical alignment
 * - Features hover animations and smooth transitions for better UX
 * - Includes categorized sections for different types of resources
 * 
 * CSS INTEGRATION:
 * - Paired with Resources.css for complete styling control
 * - Uses semantic CSS classes following BEM-like naming conventions
 * - Implements custom flexbox system for perfect button alignment
 * - Features responsive design that scales across all device sizes
 * 
 * COMPONENT STRUCTURE:
 * 1. Header section with title and description
 * 2. Resource sections organized by category
 * 3. Individual resource cards with consistent layout
 * 4. Contributing section for open-source engagement
 * 
 * RESOURCE CATEGORIES:
 * - Source Code: GitHub repository and key folders
 * - Key Files for Demo: Important files for live coding demos
 * - Documentation: Guides and architectural information
 * - Technology Stack: External frameworks and tools
 */

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import "./Resources.css";

/**
 * Main Resources component
 * 
 * Renders a fully responsive page with categorized resource links.
 * Each resource includes metadata (type, badge) and calls-to-action.
 * 
 * @returns {JSX.Element} Complete resources page layout
 */
export default function Resources(): JSX.Element {
  /**
   * Resource data structure
   * 
   * Organized into categories, each containing items with:
   * - title: Display name of the resource
   * - description: Brief explanation of what the resource contains
   * - url: Direct link to the resource (GitHub, external site, etc.)
   * - type: Category of resource (GitHub Repo, TypeScript, etc.)
   * - badge: Colored label indicating the resource's primary focus
   * 
   * NOTE: Update URLs to match your actual repository when deploying
   */
  const resources = [
    {
      category: "Source Code",
      items: [
        {
          title: "Buzzword Bingo Repository",
          description: "Complete source code for this application",
          url: "https://github.com/your-username/buzzword-bingo",
          type: "GitHub Repo",
          badge: "Full Stack"
        },
        {
          title: "Frontend Components",
          description: "React components and UI implementation",
          url: "https://github.com/your-username/buzzword-bingo/tree/main/packages/frontend",
          type: "GitHub Folder",
          badge: "React"
        },
        {
          title: "Backend APIs",
          description: "Serverless functions and game logic",
          url: "https://github.com/your-username/buzzword-bingo/tree/main/packages/backend",
          type: "GitHub Folder",
          badge: "AWS Lambda"
        }
      ]
    },
    {
      category: "Key Files for Demo",
      items: [
        {
          title: "Game Utils & Buzzwords",
          description: "Master buzzword list and game mechanics",
          url: "https://github.com/your-username/buzzword-bingo/blob/main/packages/backend/src/lib/gameUtils.ts",
          type: "TypeScript",
          badge: "Core Logic"
        },
        {
          title: "User Validation",
          description: "Nickname filtering and content moderation",
          url: "https://github.com/your-username/buzzword-bingo/blob/main/packages/backend/src/lib/userValidation.ts",
          type: "TypeScript",
          badge: "Moderation"
        },
        {
          title: "Event Formatter",
          description: "Real-time activity feed and notifications",
          url: "https://github.com/your-username/buzzword-bingo/blob/main/packages/frontend/src/utils/eventFormatter.ts",
          type: "TypeScript",
          badge: "Real-time"
        }
      ]
    },
    {
      category: "Documentation",
      items: [
        {
          title: "Demo Guide",
          description: "Key files for live coding demonstrations",
          url: "https://github.com/your-username/buzzword-bingo/blob/main/docs/KEY_FILES_FOR_DEMO.md",
          type: "Markdown",
          badge: "Demo Ready"
        },
        {
          title: "Architecture Overview",
          description: "System design and technology stack",
          url: "https://github.com/your-username/buzzword-bingo/blob/main/README.md",
          type: "README",
          badge: "Architecture"
        }
      ]
    },
    {
      category: "Technology Stack",
      items: [
        {
          title: "SST Framework",
          description: "Serverless stack for AWS deployment",
          url: "https://sst.dev/",
          type: "External",
          badge: "Infrastructure"
        },
        {
          title: "React Bootstrap",
          description: "UI component library for responsive design",
          url: "https://react-bootstrap.netlify.app/",
          type: "External",
          badge: "UI Library"
        },
        {
          title: "AWS DynamoDB",
          description: "NoSQL database for game state and user data",
          url: "https://aws.amazon.com/dynamodb/",
          type: "External",
          badge: "Database"
        }
      ]
    }
  ];

  return (
    <Container className="resources-container">
      <Row className="justify-content-center">
        <Col lg={10}>
          {/* Page Header Section */}
          <div className="resources-header">
            <h1 className="display-4 resources-title">
              Project Resources
            </h1>
            <p className="lead resources-subtitle">
              Links to source code, documentation, and key files for understanding and extending this application.
            </p>
          </div>

          {/* Dynamic Resource Sections */}
          {resources.map((section, sectionIndex) => (
            <div key={sectionIndex} className="resources-section">
              {/* Section Title */}
              <h2 className="h3 resources-section-title">
                {section.category}
              </h2>
              
              {/* Resource Cards Grid */}
              <Row className="resources-row">
                {section.items.map((item, itemIndex) => (
                  <Col key={itemIndex} xl={4} lg={6} md={6} sm={12} className="resources-col">
                    {/* Individual Resource Card */}
                    <Card className="resource-card">
                      <Card.Body className="resource-card-body">
                        {/* Card Content Area (grows to fill space) */}
                        <div className="resource-card-content">
                          {/* Card Header with Badge and Type */}
                          <div className="resource-card-header">
                            <Badge bg="primary" className="resource-badge">
                              {item.badge}
                            </Badge>
                            <small className="resource-type">{item.type}</small>
                          </div>
                          
                          {/* Resource Title */}
                          <Card.Title className="resource-title">
                            {item.title}
                          </Card.Title>
                          
                          {/* Resource Description */}
                          <Card.Text className="resource-description">
                            {item.description}
                          </Card.Text>
                        </div>
                        
                        {/* Button Container (fixed at bottom via CSS) */}
                        <div className="resource-button-container">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resource-button"
                          >
                            View Resource →
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ))}

          {/* Contributing Section - Exciting Call to Action */}
          <div className="contributing-section">
            <div className="contributing-content">

              {/* Main Headline */}
              <h3 className="contributing-title">
                Buzzword Bingo is open source!
              </h3>
              
              {/* Subtitle */}
              <p className="contributing-subtitle">
                Take the project and make it your own.
              </p>
              
              {/* Description */}
              <p className="contributing-description">
                This open-source project is great for live coding demos, educational workshops, and 
                showing off real-time web technologies. Your contributions and ideas are welcome!
              </p>

              {/* Action Buttons */}
              <div className="contributing-buttons">
                <Button
                  href="https://github.com/your-username/buzzword-bingo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contributing-button-primary"
                >
                  ⭐ Star on GitHub
                </Button>
                
                <Button
                  href="https://github.com/your-username/buzzword-bingo/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contributing-button-secondary"
                >
                  🐛 Report Issues
                </Button>
                
                <Button
                  href="https://github.com/your-username/buzzword-bingo/fork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contributing-button-secondary"
                >
                  🍴 Fork & Contribute
                </Button>
              </div>

              {/* Stats Section */}
              <div className="contributing-stats">
                <div className="contributing-stat">
                  <span className="contributing-stat-number">100%</span>
                  <span className="contributing-stat-label">Open Source</span>
                </div>
                <div className="contributing-stat">
                  <span className="contributing-stat-number">⚡</span>
                  <span className="contributing-stat-label">Real-time</span>
                </div>
                <div className="contributing-stat">
                  <span className="contributing-stat-number">🎯</span>
                  <span className="contributing-stat-label">Demo Ready</span>
                </div>
                <div className="contributing-stat">
                  <span className="contributing-stat-number">📱</span>
                  <span className="contributing-stat-label">Responsive</span>
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
} 