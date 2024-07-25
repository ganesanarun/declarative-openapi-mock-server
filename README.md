# Declarative OpenAPI Mock Server

This project provides a declarative OpenAPI mock server with conditional responses, supporting rules such as "and" and "
or" conditions, case sensitivity, and comparison operators.

## Features

- Declarative configuration using OpenAPI specifications
- Conditional responses based on request payload, query and headers, path parameters
- Supports "and" / "or" conditions
- Case sensitivity and comparison operators (e.g., `eq`, `lt`, `lte`, `gt`, `gte`)
- Default random success response according to OpenAPI spec when no custom logic is specified

> Note: Since yaml is a superset of json, you could put json body directly.

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

## Usage

1. Place your OpenAPI specification files in the `specs` directory. Ensure each spec file has the custom logic defined
   under `x-custom-logic`.
2. Run the mock server:

   ```sh
   npm start
   ```

   The mock server will start on [http://localhost:3000](http://localhost:3000).

## Docker

### Build and Run the Docker Image

1. **Build the Docker Image**:
   Navigate to the directory containing your Dockerfile and run:
   ```sh
   docker build -t openapi-mock-server .
   ```

2. **Run the Docker Container**:
   Run the container, mapping the exposed ports:
   ```sh
   docker run -p 3000:3000 -p 4010:4010 openapi-mock-server
   ```

## OpenAPI Specification Example

```yaml
openapi: 3.0.0
info:
  title: Simple API
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
              - location: body
                field: name
                value: special
                caseSensitive: false
                operator: eq
              - location: body
                field: metadata.role
                value: admin
                operator: eq
            response:
              statusCode: 200
              body:
                id: 1000
                name: Admin User
              headers:
                X-Custom-Header: custom_value
          - type: and
            rules:
              - location: body
                field: name
                value: John
                caseSensitive: true
                operator: eq
              - location: body
                field: metadata.role
                value: manager
                operator: eq
            response:
              statusCode: 201
              body: {
                "id": 1002,
                "name": "Age 30 or below User",
                "metadata": {
                  "age": 25
                }
              }
              headers:
                X-Custom-Header: manager_value
          - type: and
            rules:
              - location: body
                field: age
                value: 30
                operator: lte
            response:
              statusCode: 200
              body:
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

## Custom Logic Configuration

The `x-custom-logic` attribute allows you to define custom conditional responses.
Each condition can contain multiple rules that are either `and` or `or` conditions.
Each rule specifies:

- `location`: The part of the request to evaluate (`body`, `header`, `query`, 'path').
- `field`: The field to match.
- `value`: The value to compare against.
- `caseSensitive`: Whether the comparison is case-sensitive.
- `operator`: The comparison operator (`eq`, `lt`, `lte`, `gt`, `gte`).

The response section of each condition specifies the `statusCode`, `body`, and `headers` to return if the condition is
met.

## Example

For a POST request to `/users` with the body:

```json
{
  "name": "special",
  "metadata": {
    "role": "user"
  },
  "age": 25
}
```

The server will respond with:

```json
{
  "id": 1000,
  "name": "Admin User"
}
```

with headers:

```json
{
  "X-Custom-Header": "custom_value"
}
```

if the request matches the first condition in `x-custom-logic`.

If the request matches no custom logic conditions,
a random success response, according to the OpenAPI specification, will
be returned.
