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
   * Resource data structure based on actual project resources
   * 
   * Organized into categories matching the project's documentation structure.
   * Each resource includes title, description, URL, type, and badge for categorization.
   */
  const resources = [
   
    {
      category: "Project Development",
      items: [
        {
          title: "Vision",
          description: "Project vision and goals documentation",
          url: "https://github.com/groovysquirrel/buzzword-bingo/blob/base-bingo-app/docs/1-Vision.md",
          type: "Documentation",
          badge: "Problem Statement"
        },
        {
          title: "ChatGPT Requirements Conversation",
          description: "Requirements gathering conversation with AI",
          url: "https://github.com/groovysquirrel/buzzword-bingo/blob/base-bingo-app/docs/2-ChatGPT_requirements_conversation.md",
          type: "Documentation",
          badge: "Brainstorming"
        },
        {
          title: "Mockup",
          description: "User interface mockup and design",
          url: "https://github.com/groovysquirrel/buzzword-bingo/blob/base-bingo-app/docs/3-mockup_user_screen.png",
          type: "Image",
          badge: "Design"
        },
        {
          title: "Version 1 Prompt",
          description: "Initial development prompt and specifications",
          url: "https://github.com/groovysquirrel/buzzword-bingo/blob/base-bingo-app/docs/4-BuildV1.md",
          type: "Documentation",
          badge: "Build Prompt"
        },
        {
          title: "Websocket Prompt",
          description: "WebSocket implementation guidance and specifications",
          url: "https://github.com/groovysquirrel/buzzword-bingo/blob/base-bingo-app/docs/5-WebsocketImplementation.md",
          type: "Documentation",
          badge: "WebSocket Upgrade"
        },
        {
          title: "Workshopable Files",
          description: "Key files for live coding demonstrations and workshops",
          url: "https://github.com/groovysquirrel/buzzword-bingo/blob/base-bingo-app/docs/KEY_FILES_FOR_DEMO.md",
          type: "Documentation",
          badge: "Demo Time"
        }
      ]
    },
    {
      category: "Development Framework",
      items: [
        {
          title: "Serverless Stack (SST)",
          description: "Modern full-stack framework for AWS",
          url: "https://sst.dev/",
          type: "Framework",
          badge: "Infrastructure"
        },
        {
          title: "SST Getting Started Guide",
          description: "Comprehensive guide to getting started with SST",
          url: "https://guide.sst.dev/",
          type: "Tutorial",
          badge: "Learning"
        },
        {
          title: "SST Sample Project (Notes App)",
          description: "Reference implementation of an SST application",
          url: "https://github.com/sst/demo-notes-app",
          type: "GitHub Repo",
          badge: "Example"
        }
      ]
    },
    {
      category: "Development Tools",
      items: [
        {
          title: "Cursor AI",
          description: "AI-powered code editor used for development",
          url: "https://www.cursor.com/",
          type: "Tool",
          badge: "AI Editor"
        },
        {
          title: "Anthropic Claude 4.0",
          description: "Advanced AI assistant for code generation and analysis",
          url: "https://www.anthropic.com/",
          type: "AI Service",
          badge: "AI Assistant"
        }
      ]
    },
    {
      category: "Source Code",
      items: [
        {
          title: "Base Project (Updated SST)",
          description: "Updated SST project foundation",
          url: "https://github.com/groovysquirrel/buzzword-bingo/tree/base-project",
          type: "GitHub Branch",
          badge: "Foundation"
        },
        {
          title: "Base Bingo Code",
          description: "Core bingo application implementation",
          url: "https://github.com/groovysquirrel/buzzword-bingo/tree/base-bingo-app",
          type: "GitHub Branch",
          badge: "Application"
        }
      ]
    },
    {
      category: "AWS Documentation",
      items: [
        {
          title: "Bedrock Invoke Documentation",
          description: "AWS Bedrock API documentation for model invocation",
          url: "https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-runtime_example_bedrock-runtime_InvokeModel_MetaLlama3_section.html",
          type: "AWS Docs",
          badge: "AI/ML"
        },
        {
          title: "DynamoDB Best Practices",
          description: "Best practices guide for AWS DynamoDB usage",
          url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html",
          type: "AWS Docs",
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
                  href="https://github.com/groovysquirrel/buzzword-bingo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contributing-button-primary"
                >
                  ⭐ Star on GitHub
                </Button>
                
                <Button
                  href="https://github.com/groovysquirrel/buzzword-bingo/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contributing-button-secondary"
                >
                  🐛 Report Issues
                </Button>
                
                <Button
                  href="https://github.com/groovysquirrel/buzzword-bingo/fork"
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