# Maintenance_exercice

### Adrien Mallevaey , Lorenzo Vandenkoornhuyse
### Group 3
Fork from
### Alluin Edouard, Behani Julien
### Group: 2

This project is a web application that allows users to browse products, authenticate, and add products to a shopping cart.
It is built with a Node.js / Express API, a MySQL database, and a frontend served by the backend, all containerized with Docker.

## TechStack

- Backend: Node.js, Express
- Database: MySQL 8
- Authentication: JWT (JSON Web Token)
- Password hashing: bcrypt
- Containerization: Docker & Docker Compose
- Frontend: HTML / CSS / JavaScript (served as static files)

## Installation

To install the project on your computer, ensure docker is started and running.

Then, use the docker-compose.yaml to create the project containers

```bash
docker compose up
```
**or**
```bash
docker-compose up
```

This will:
- Start the API server
- Start the MySQL database
- Initialize the database using init.sql
- Serve the frontend automatically

To reset your database:

```bash
docker compose down

rm ./bdd # Database folder
```


## Usage

To connect to the website:
```http
http://localhost:3000
```

To connect to the api:
```http
http://localhost:3000/api
```
## Security

- Security Features
- Passwords are hashed using bcrypt
- Authentication via JWT
- SQL Injection protection via prepared statements
- Restricted access to protected routes
- Docker network isolation between services
