# 🗄️ LostFy Normalized Database ER Diagram & Reference

This directory contains the SQL scripts to initialize and seed the MySQL database for the LostFy platform.

## 📊 Entity Relationship Diagram

The following Mermaid diagram documents the tables, primary/foreign keys, and cardinalities of the database schema:

```mermaid
erDiagram
    users {
        int id PK
        varchar name
        varchar email UK
        varchar password
        enum role
        decimal trust_score
        timestamp created_at
        timestamp updated_at
    }

    items {
        int id PK
        int user_id FK
        enum type
        enum category
        varchar title
        text description
        decimal location_lat
        decimal location_lng
        varchar location_text
        varchar image_url
        enum status
        json ai_tags
        text ocr_text
        timestamp created_at
        timestamp updated_at
    }

    verification_questions {
        int id PK
        int item_id FK
        text question
        timestamp created_at
    }

    claims {
        int id PK
        int lost_item_id FK
        int found_item_id FK
        int claimer_id FK
        enum status
        decimal confidence_score
        timestamp created_at
        timestamp updated_at
    }

    claim_answers {
        int id PK
        int claim_id FK
        int question_id FK
        text answer
        timestamp created_at
    }

    ai_matches {
        int id PK
        int lost_item_id FK
        int found_item_id FK
        decimal similarity_score
        timestamp checked_at
    }

    meetings {
        int id PK
        int claim_id FK
        timestamp meeting_time
        varchar meeting_location
        varchar handshake_hash
        enum status
        timestamp created_at
    }

    otps {
        int id PK
        varchar email
        varchar otp_code
        timestamp expires_at
        tinyint is_used
        timestamp created_at
    }

    notifications {
        int id PK
        int user_id FK
        varchar title
        text message
        tinyint is_read
        timestamp created_at
    }

    admin_logs {
        int id PK
        int admin_id FK
        varchar action
        text details
        timestamp created_at
    }

    users ||--o{ items : "creates"
    users ||--o{ claims : "submits"
    users ||--o{ notifications : "receives"
    users ||--o{ admin_logs : "performs"
    items ||--o{ verification_questions : "contains"
    items ||--o{ claims : "claimed_as"
    items ||--o{ ai_matches : "matched_in"
    claims ||--o{ claim_answers : "has"
    claims ||--|| meetings : "schedules"
    verification_questions ||--o{ claim_answers : "answered_by"
```

## 🛠️ Included Files
*   [schema.sql](file:///c:/Users/themd/OneDrive/Desktop/lostfy/database/schema.sql) — DDL script to create database and tables.
