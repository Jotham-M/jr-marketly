from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="E-Commerce AI Microservice", version="1.0")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class DescriptionRequest(BaseModel):
    keywords: str
    product_name: str

@app.post("/api/v1/ai/generate-description")
def generate_product_description(data: DescriptionRequest):
    try:
        prompt = (
            f"Write a professional, compelling, SEO-optimized e-commerce product description "
            f"for a product named '{data.product_name}' based on these keywords: {data.keywords}."
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert e-commerce copywriter."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=150
        )
        
        description = response.choices[0].message.content.strip()
        return {"product_name": data.product_name, "generated_description": description}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))