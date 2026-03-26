# EventZen - Event Management System

## About the Project
This project is a full-stack event management system where users can browse events, manage venues, and make bookings.  

I built this project to understand how frontend and backend systems work together, and to explore a microservices-style architecture using different technologies.

---

## Tech Stack

Frontend:
- React
- React Router
- CSS

Backend:
- Spring Boot (User & Venue services)
- Node.js (Booking service)

Database:
- MySQL

---

## Features
- User registration and login  
- View and explore events  
- Manage venues and vendors  
- Book events  
- REST API integration between frontend and backend  

---

## Project Structure

EventZen/
- project_frontend → React app  
- UserAndAttendeeService → Spring Boot service  
- Venue-Management → Spring Boot service  
- event-booking-service → Node.js service  

---

## How it works

The frontend is built as a single page application using React.  
It communicates with backend services through REST APIs.  

The backend is divided into multiple services:
- Spring Boot handles user and venue management  
- Node.js handles event booking  

Each service interacts with the database and returns data in JSON format.

---

## Running the Project

1. Clone the repo
git clone https://github.com/SpandanaRay07/EventZen.git

cd EventZen


2. Run frontend

cd project_frontend
npm install
npm start


3. Run Spring Boot services

cd UserAndAttendeeService
mvn spring-boot:run

cd Venue-Management
mvn spring-boot:run


4. Run Node.js service

cd event-booking-service
npm install
node service.js


---

## Future Improvements
- Add proper JWT authentication  
- Deploy the project  
- Improve UI/UX  
- Add more validations  

---

## Author
Spandana Ray
