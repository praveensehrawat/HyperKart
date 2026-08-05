"""
AI Service
==========
Provides smart hyperlocal product recommendations and OpenAI-driven search insights.
Serves requests forwarded from the Spring Boot backend service.
"""

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import openai
from dotenv import load_dotenv

# Load environment configuration from a local .env file
load_dotenv()

app = FastAPI(title="AI Service")

# Initialize OpenAI configurations
openai.api_key = os.getenv("OPENAI_API_KEY")
openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


class Product(BaseModel):
    """
    Representation of a product available in the hyperlocal marketplace.
    Used for local scoring and sorting.
    """
    id: str
    name: str
    description: Optional[str] = None
    category: str
    sellerId: str
    stock: int
    price: float
    sellerName: Optional[str] = None
    imageUrl: Optional[str] = None


class SellerLocation(BaseModel):
    """
    Represents a seller location metadata payload containing seller details
    and computed distance from the customer in kilometers.
    """
    seller: Dict[str, Any]
    distanceKm: Optional[float] = None


class RecommendationRequest(BaseModel):
    """
    Input schema for the recommendation and smart search requests.
    Contains the full catalogue of active products, customer query,
    nearby sellers, and preferred buyer categories.
    """
    products: List[Product]
    query: Optional[str] = None
    nearby_sellers: List[SellerLocation] = []
    preferred_categories: List[str] = []
    weather: Optional[str] = None
    time_of_day: Optional[str] = None


# Weather keywords mapping
WEATHER_ITEMS = {
    "cold": ["tea", "coffee", "soup", "cocoa", "jacket", "sweater", "heater", "hot chocolate", "porridge"],
    "hot": ["ice cream", "cold drink", "soda", "juice", "lemonade", "ice", "fan", "ac", "watermelon", "cucumber", "salad"],
    "rainy": ["umbrella", "raincoat", "tea", "soup", "boots", "poncho"],
    "sunny": ["sunglasses", "sunscreen", "hat", "ice cream", "juice", "lemonade"]
}

# Time of day keywords mapping
TIME_ITEMS = {
    "morning": ["breakfast", "tea", "coffee", "milk", "bread", "butter", "egg", "cereal", "oatmeal", "juice"],
    "afternoon": ["lunch", "meal", "soda", "rice", "sandwich", "salad", "fruit"],
    "evening": ["tea", "coffee", "snacks", "cookies", "chips", "soup"],
    "night": ["dinner", "milk", "snack", "dessert", "tea", "chamomile", "pillow"]
}


def score(
    p: Product,
    query: Optional[str],
    preferred_categories: List[str],
    nearby_seller_ids: List[str],
    weather: Optional[str] = None,
    time_of_day: Optional[str] = None
) -> float:
    """
    Calculates a match score for a product based on query keywords, preferred
    categories, seller proximity, stock availability, weather, and time of day.
    """
    s = 0.0
    if query:
        q = query.lower()
        if q in p.name.lower():
            s += 10
        if p.description and q in p.description.lower():
            s += 5
        if q in p.category.lower():
            s += 7
    if p.category in preferred_categories:
        s += 8
    if p.sellerId in nearby_seller_ids:
        s += 15
    if p.stock > 0:
        s += 2

    # Apply weather boost (+12.0)
    if weather:
        w = weather.lower()
        keywords = WEATHER_ITEMS.get(w, [])
        for kw in keywords:
            if kw in p.name.lower() or kw in p.category.lower() or (p.description and kw in p.description.lower()):
                s += 12.0
                break

    # Apply time of day boost (+12.0)
    if time_of_day:
        t = time_of_day.lower()
        keywords = TIME_ITEMS.get(t, [])
        for kw in keywords:
            if kw in p.name.lower() or kw in p.category.lower() or (p.description and kw in p.description.lower()):
                s += 12.0
                break

    return s


def score_products(
    products: List[Product],
    query: Optional[str],
    nearby_sellers: List[SellerLocation],
    preferred_categories: List[str],
    weather: Optional[str] = None,
    time_of_day: Optional[str] = None
) -> List[Product]:
    """
    Scores and sorts the products list in descending order of relevance.
    Filters products to keep only relevant items when a search query is provided.
    """
    if query and query.strip():
        q = query.strip().lower()
        query_words = [w for w in q.split() if len(w) > 1]
        
        filtered_products = []
        for p in products:
            matches_query = (q in p.name.lower() or 
                             q in p.category.lower() or 
                             (p.description and q in p.description.lower()))
            matches_words = any(w in p.name.lower() or w in p.category.lower() or (p.description and w in p.description.lower()) for w in query_words)
            if matches_query or matches_words:
                filtered_products.append(p)
        products = filtered_products

    nearby_seller_ids = [seller.seller['id'] for seller in nearby_sellers]

    scored_products = sorted(
        products,
        key=lambda p: score(p, query, preferred_categories, nearby_seller_ids, weather, time_of_day),
        reverse=True
    )
    return scored_products


async def fetch_openai_insight(
    query: str,
    top_products: List[Product],
    weather: Optional[str] = None,
    time_of_day: Optional[str] = None
) -> str:
    """
    Sends customer query and top matched products to OpenAI chat completions
    to generate a friendly natural language recommendation.
    Falls back to a static recommendation message if api key is missing or calls fail.
    """
    if not openai.api_key or not query:
        msg = "Based on your search, we found great local options nearby. Check the recommended products above!"
        if weather or time_of_day:
            msg = f"Suggestions optimized for a {weather or ''} {time_of_day or ''}. Check out the recommended products above!"
        return msg

    try:
        product_list = ", ".join([f"{p.name} (${p.price}, {p.category})" for p in top_products])

        weather_ctx = f"Weather: {weather}." if weather else ""
        time_ctx = f"Time: {time_of_day}." if time_of_day else ""

        messages = [
            {"role": "system", "content": "You are a hyperlocal commerce assistant. Give a brief 2-sentence shopping recommendation. Factor in local weather or time of day context if provided."},
            {"role": "user", "content": f"Query: {query}. {weather_ctx} {time_ctx} Top products: {product_list}"}
        ]

        response = openai.chat.completions.create(
            model=openai_model,
            messages=messages,
            max_tokens=120
        )

        if response.choices:
            return response.choices[0].message.content.strip().replace('\n', ' ')
    except Exception as e:
        print(f"OpenAI API call failed: {e}")

    msg = "Based on your search, we found great local options nearby. Check the recommended products above!"
    if weather or time_of_day:
        msg = f"Suggestions optimized for a {weather or ''} {time_of_day or ''}. Check out the recommended products above!"
    return msg


@app.post("/api/recommend")
async def recommend(request: RecommendationRequest):
    """
    Personalized recommendation endpoint. Scores products using query, nearby sellers, 
    and preferred buyer categories, then adds OpenAI-based natural language insights.
    """
    scored = score_products(
        request.products,
        request.query,
        request.nearby_sellers,
        request.preferred_categories,
        request.weather,
        request.time_of_day
    )

    ai_insight = None
    if request.query or request.weather or request.time_of_day:
        ai_insight = await fetch_openai_insight(
            request.query or "popular items",
            scored[:5],
            request.weather,
            request.time_of_day
        )

    return {
        "recommendations": scored[:8],
        "aiInsight": ai_insight,
        "source": "hybrid" if openai.api_key else "rule-based"
    }


@app.post("/api/search")
async def search(request: RecommendationRequest):
    """
    Non-personalized search endpoint. Reuses the recommendation scoring framework
    with personalization criteria skipped.
    """
    return await recommend(request)


@app.get("/")
def read_root():
    """
    Root status endpoint.
    """
    return {"status": "ai-service is running"}


@app.get("/health")
def health():
    """
    Readiness and health check endpoint.
    """
    return {"status": "healthy"}