import swaggerJsDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "School Management System API",
      version: "1.0.0",
      description: "Enterprise-grade multi-school API"
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ["src/modules/**/*.ts"]
});
