# Declarative OpenAPI Mock Server

This project provides a declarative OpenAPI mock server with conditional responses, supporting rules such as "and" and "or" conditions, case sensitivity, and comparison operators.

## Features

- Declarative configuration using OpenAPI specifications
- Conditional responses based on request payload
- Supports "and" / "or" conditions
- Case sensitivity and comparison operators (e.g., `eq`, `lt`, `lte`, `gt`, `gte`)

## Prerequisites

- Node.js (v20 or higher)
- npm (v10 or higher)

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/ganesanarun/declarative-openapi-mock-node-server.git
   cd declarative-openapi-mock-server
   ```
2. Install the dependencies:

    ```sh
    npm install
    ```

3. Usage

    1.	Place your OpenAPI specification files in the specs directory. Ensure each spec file has the custom logic defined under x-custom-logic.
	2.	Run the mock server:

    ```sh
    npm start
    ```

    The mock server will start on http://localhost:3000.

4. OpenAPI Specification Example

    openapi: 3.0.0
    info:
    title: Simple API 1
    version: 1.0.0
    paths:
        /users:
            post:
            summary: Create a user
            operationId: createUser
            tags:
                - User
            requestBody:
                required: true
                content:
                application/json:
                    schema:
                    $ref: '#/components/schemas/User'
            responses:
                '200':
                description: User created successfully
                content:
                    application/json:
                    schema:
                        $ref: '#/components/schemas/User'
            x-custom-logic:
                type: conditionalResponse
                conditions:
                - type: or
                    rules:
                    - field: name
                        value: special
                        caseSensitive: false
                    - field: metadata.role
                        value: admin
                    response:
                    id: 1000
                    name: Admin User
                - type: and
                    rules:
                    - field: name
                        value: John
                        caseSensitive: true
                    - field: metadata.role
                        value: manager
                        operator: eq
                    response:
                    id: 1001
                    name: Manager User
                - type: and
                    rules:
                    - field: age
                        value: 30
                        operator: lte
                    response:
                    id: 1002
                    name: Age 30 or below User
    components:
        schemas:
            User:
            type: object
            properties:
                id:
                type: integer
                example: 1
                name:
                type: string
                example: "John Doe"
                metadata:
                type: object
                properties:
                    role:
                    type: string
                    example: "user"
                age:
                type: integer
                example: 25
    ```