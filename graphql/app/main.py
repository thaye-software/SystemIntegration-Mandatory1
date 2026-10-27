# FastAPI is the web application that receives HTTP requests.
# GraphQLRouter publishes the schema at /graphql.
# schema is the query and mutation API defined in app.schema.

from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from app.schema import schema

app = FastAPI(title="Library GraphQL API")
app.include_router(GraphQLRouter(schema), prefix="/graphql")
