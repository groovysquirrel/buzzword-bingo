import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Default word categories to seed into the database
 * These are organized by logical business/tech categories for better game balance
 */
const DEFAULT_WORD_CATEGORIES = {
  "Technology": [
    "AI", "Machine Learning", "Cloud Native", "Microservices", "Kubernetes",
    "Serverless", "Edge Computing", "Big Data", "IoT", "Blockchain",
    "Digital Twin", "API-First", "DevOps", "GitOps", "Infrastructure as Code",
    "Containerization", "Orchestration", "Auto-scaling", "Load Balancing", "CDN"
  ],
  "Business": [
    "Synergy", "Leverage", "Optimize", "Streamline", "Paradigm Shift",
    "Disruptive Innovation", "Game Changer", "Best Practice", "Core Competency", "Value Proposition",
    "Market Penetration", "Thought Leadership", "Customer Journey", "User Experience", "Growth Hacking",
    "Agile Transformation", "Digital Transformation", "Change Management", "Stakeholder Alignment", "ROI"
  ],
  "Strategy": [
    "Strategic Initiative", "Roadmap", "Milestone", "KPI", "OKR",
    "North Star", "Vision", "Mission Critical", "Scalable", "Sustainable",
    "Future-Proof", "Innovation Lab", "Center of Excellence", "Tiger Team", "War Room",
    "Deep Dive", "Circle Back", "Touch Base", "Ideate", "Pivot"
  ],
  "Process": [
    "Workflow", "Pipeline", "Framework", "Methodology", "Best-in-Class",
    "End-to-End", "Holistic Approach", "Cross-functional", "Collaborative", "Integrated",
    "Seamless", "Frictionless", "Omnichannel", "360-degree", "Full-stack",
    "Low-code", "No-code", "Self-service", "Automated", "Intelligent"
  ]
};

/**
 * Seed Words Function
 * 
 * Populates the Words table with default word categories.
 * This creates the foundation for dynamic word selection in games.
 */
export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log("Seeding default word categories into DynamoDB");

  try {
    // Check if we have the Words table resource
    if (!Resource.Words.name) {
      console.log("Words table not found");
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          categoriesCreated: 0,
          totalWords: 0,
          error: "Words table not configured",
          message: "The Words table resource is not available. Check infrastructure setup."
        }),
      };
    }

    const categories = Object.keys(DEFAULT_WORD_CATEGORIES);
    let totalWords = 0;
    let successCount = 0;

    // Insert each category as a separate item
    for (const category of categories) {
      const words = DEFAULT_WORD_CATEGORIES[category as keyof typeof DEFAULT_WORD_CATEGORIES];
      
      try {
        await dynamoDb.send(new PutCommand({
          TableName: Resource.Words.name,
          Item: {
            category: category,
            words: words,
            createdAt: new Date().toISOString(),
            wordCount: words.length
          }
        }));
        
        totalWords += words.length;
        successCount++;
        console.log(`Seeded category '${category}' with ${words.length} words`);
        
      } catch (error) {
        console.error(`Failed to seed category '${category}':`, error);
      }
    }

    if (successCount === 0) {
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          categoriesCreated: 0,
          totalWords: 0,
          error: "Failed to seed any categories",
          message: "All category insertions failed. Check database permissions."
        }),
      };
    }

    console.log(`Successfully seeded ${successCount} categories with ${totalWords} total words`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: true,
        categoriesCreated: successCount,
        totalWords,
        categories: categories.slice(0, successCount),
        message: `Successfully seeded ${successCount} categories with ${totalWords} words`
      }),
    };

  } catch (error) {
    console.error("Error seeding word categories:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: false,
        categoriesCreated: 0,
        totalWords: 0,
        error: "Failed to seed word categories",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
} 