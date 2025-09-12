# FAKE API 
A lightweight mock API server for testing and prototyping frontend applications.
This project simulates RESTful API endpoints so developers can build and test their apps without needing a real backend.

## Features
- Provides predefined JSON responses for different endpoints  
- Supports CRUD operations (`GET`, `POST`, `PUT`, `DELETE`)  
- Easy to extend with new routes  
- Lightweight and fast

## Tech Stack
- Next.js
- PostgreSQL

## Installation
- Clone the repository and install dependencies:
```bash
git clone https://github.com/NguyenNgocDang246/fake-api
cd fake-api
npm install
```
- Create a .env file in the root folder, copy `.env.example` to `.env` and update the values as needed.

- Run prisma migration:
````bash
npx prisma migrate dev --name init
````

## Usage
- Start the server
````bash
npm run dev
````

