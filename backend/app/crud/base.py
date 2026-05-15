from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union, Tuple

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.base_class import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).
        **Parameters**
        * `model`: A SQLAlchemy model class
        """
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        return db.query(self.model).filter(self.model.id == id).first()

    def get_multi(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100, 
        filters: Dict[str, Any] = None,
        order_by: Any = None
    ) -> List[ModelType]:
        query = db.query(self.model)
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.filter(getattr(self.model, field) == value)
        
        if order_by is not None:
            query = query.order_by(order_by)
        elif hasattr(self.model, "id"):
            query = query.order_by(self.model.id.desc())
            
        return query.offset(skip).limit(limit).all()

    def get_multi_with_count(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100, 
        filters: Dict[str, Any] = None,
        order_by: Any = None
    ) -> Tuple[List[ModelType], int]:
        query = db.query(self.model)
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.filter(getattr(self.model, field) == value)
        
        total = query.count()
        
        if order_by is not None:
            query = query.order_by(order_by)
        elif hasattr(self.model, "id"):
            query = query.order_by(self.model.id.desc())
            
        items = query.offset(skip).limit(limit).all()
        return items, total

    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]],
        updated_by_id: Optional[int] = None
    ) -> ModelType:
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
            
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        if updated_by_id and hasattr(db_obj, "updated_by_id"):
            db_obj.updated_by_id = updated_by_id
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> Optional[ModelType]:
        obj = db.query(self.model).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj