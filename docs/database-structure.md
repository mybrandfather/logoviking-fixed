# Database Structure

Logoviking currently uses browser storage for the launch demo, but this is the production schema recommended for a real deployment.

## Tables

### users

- id
- name
- email
- password_hash
- provider
- tier
- created_at
- updated_at

### usage_events

- id
- user_id
- tool_slug
- query
- created_at

### favorites

- id
- user_id
- tool_slug
- created_at

### saved_projects

- id
- user_id
- tool_slug
- title
- summary
- payload_json
- created_at

### subscriptions

- id
- user_id
- plan_name
- status
- started_at
- renewed_at
- canceled_at

### blog_posts

- id
- slug
- title
- excerpt
- content_json
- category
- created_at
- updated_at

### faqs

- id
- question
- answer
- section
- sort_order

### contact_messages

- id
- name
- email
- message
- status
- created_at

### ad_slots

- id
- placement
- label
- active
- created_at

## Notes

- Keep tool history separate from favorites for easier analytics.
- Store blog content in structured JSON so TOC and schema can be generated automatically.
- Use indexed slug fields for fast dynamic routing.