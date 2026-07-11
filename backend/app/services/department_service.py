# ==============================================================================
# Hospital Information Assistance — Department Service
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Contains all business logic for hospital department management.
#   Departments are the top-level organizational units of the hospital
#   (e.g., Cardiology, Neurology, Pediatrics).
#   Doctors are linked to departments via foreign key.
#
# OPERATIONS:
#   - create_department()    → Add a new department (admin only)
#   - get_all_departments()  → Paginated list with doctor count
#   - get_department_by_id() → Single department with its doctors list
#   - update_department()    → Partial update (admin only)
#   - delete_department()    → Delete with safety check (admin only)
# ==============================================================================

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.department import Department
from app.models.doctor import Doctor
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentListResponse,
    DepartmentDetailResponse,
    DoctorInDepartment
)


# ==============================================================================
# DEPARTMENT SERVICE CLASS
# ==============================================================================
class DepartmentService:

    # --------------------------------------------------------------------------
    # CREATE DEPARTMENT
    # WHY: Allows admins to add new hospital departments to the system.
    # WHAT: Validates name uniqueness, then inserts the new department.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - dept_data: DepartmentCreate → validated department data from request
    # OUTPUT: DepartmentResponse with the newly created department
    #         Raises HTTP 409 if a department with the same name already exists
    # --------------------------------------------------------------------------
    @staticmethod
    async def create_department(
        db: AsyncSession,
        dept_data: DepartmentCreate
    ) -> DepartmentResponse:
        """
        Creates a new hospital department.

        Steps:
        1. Check the department name is not already taken
        2. Insert the new department into the database
        3. Return the created department with doctor_count = 0

        Args:
            db: Async database session.
            dept_data: Validated department creation data.

        Returns:
            DepartmentResponse for the newly created department.

        Raises:
            HTTPException 409: If a department with that name already exists.
        """

        # Step 1: Check for duplicate department name
        existing = await db.execute(
            select(Department).where(Department.name == dept_data.name)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A department named '{dept_data.name}' already exists."
            )

        # Step 2: Create the new Department model instance
        new_dept = Department(
            name=dept_data.name,
            description=dept_data.description,
            location=dept_data.location,
            phone=dept_data.phone
        )

        # Step 3: Save to database
        db.add(new_dept)
        await db.flush()
        await db.refresh(new_dept)

        # Sync to Qdrant vector database (fail silently to avoid blocking DB transaction)
        from app.services.rag_service import RAGService
        try:
            await RAGService.sync_department(db=db, dept_id=new_dept.id)
        except Exception:
            pass

        # Step 4: Return response (new dept has 0 doctors)
        return DepartmentResponse(
            **new_dept.__dict__,
            doctor_count=0
        )

    # --------------------------------------------------------------------------
    # GET ALL DEPARTMENTS
    # WHY: Returns the full list of departments for the frontend department page.
    #      Includes doctor_count to show how many doctors each dept has.
    # WHAT: Paginated query with a subquery to count doctors per department.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - skip: int → pagination offset
    #   - limit: int → max records per page
    #   - search: Optional[str] → optional name search filter
    # OUTPUT: DepartmentListResponse with total count and list of departments
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_all_departments(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 10,
        search: str = None
    ) -> DepartmentListResponse:
        """
        Returns a paginated list of all hospital departments.
        Each department includes a doctor_count field.

        Args:
            db: Async database session.
            skip: Pagination offset (number of records to skip).
            limit: Max records to return per page.
            search: Optional name search string (case-insensitive).

        Returns:
            DepartmentListResponse with total and list of departments.
        """

        # Build base query for departments
        query = select(Department)

        # Apply optional name search filter (case-insensitive)
        if search:
            query = query.where(
                Department.name.ilike(f"%{search}%")  # ilike = case-insensitive LIKE
            )

        # Get total count of matching departments
        count_result = await db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        # Fetch paginated departments
        result = await db.execute(
            query.offset(skip).limit(limit).order_by(Department.name)
        )
        departments = result.scalars().all()

        # For each department, get the count of its doctors
        dept_responses = []
        for dept in departments:
            # Count doctors in this department
            doc_count_result = await db.execute(
                select(func.count(Doctor.id)).where(Doctor.department_id == dept.id)
            )
            doc_count = doc_count_result.scalar_one()

            dept_responses.append(
                DepartmentResponse(
                    **{
                        k: v for k, v in dept.__dict__.items()
                        if not k.startswith("_")  # Exclude SQLAlchemy internals
                    },
                    doctor_count=doc_count
                )
            )

        return DepartmentListResponse(total=total, departments=dept_responses)

    # --------------------------------------------------------------------------
    # GET DEPARTMENT BY ID
    # WHY: Returns a single department's full details including its doctors.
    #      Used for the department detail page.
    # WHAT: Fetches the department and eagerly loads its associated doctors.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - dept_id: int → the department's primary key
    # OUTPUT: DepartmentDetailResponse with dept info + list of doctors
    #         Raises HTTP 404 if not found
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_department_by_id(
        db: AsyncSession,
        dept_id: int
    ) -> DepartmentDetailResponse:
        """
        Fetches a single department by ID with its full doctor list.
        Used for the department detail/profile page.

        Args:
            db: Async database session.
            dept_id: The database ID of the department.

        Returns:
            DepartmentDetailResponse with department info and doctors list.

        Raises:
            HTTPException 404: If no department with that ID exists.
        """

        # Fetch department with its doctors using eager loading
        # selectinload prevents the N+1 query problem
        result = await db.execute(
            select(Department)
            .where(Department.id == dept_id)
            .options(selectinload(Department.doctors))  # Load doctors in same query
        )
        dept = result.scalar_one_or_none()

        if dept is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {dept_id} not found."
            )

        # Build doctor brief list for the response
        doctor_list = [
            DoctorInDepartment(
                id=doc.id,
                full_name=doc.full_name,
                specialization=doc.specialization,
                experience_years=doc.experience_years,
                consultation_fee=doc.consultation_fee
            )
            for doc in dept.doctors
        ]

        return DepartmentDetailResponse(
            id=dept.id,
            name=dept.name,
            description=dept.description,
            location=dept.location,
            phone=dept.phone,
            doctor_count=len(doctor_list),
            created_at=dept.created_at,
            updated_at=dept.updated_at,
            doctors=doctor_list
        )

    # --------------------------------------------------------------------------
    # UPDATE DEPARTMENT
    # WHY: Allows admins to edit department information (partial update).
    # WHAT: Only updates fields that are explicitly provided in dept_data.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - dept_id: int → the department to update
    #   - dept_data: DepartmentUpdate → fields to update (all optional)
    # OUTPUT: DepartmentResponse with updated data
    #         Raises HTTP 404 if not found
    #         Raises HTTP 409 if new name conflicts with another department
    # --------------------------------------------------------------------------
    @staticmethod
    async def update_department(
        db: AsyncSession,
        dept_id: int,
        dept_data: DepartmentUpdate
    ) -> DepartmentResponse:
        """
        Partially updates a department's information.
        Only provided fields are updated — omitted fields remain unchanged.

        Args:
            db: Async database session.
            dept_id: ID of the department to update.
            dept_data: Fields to update (all optional).

        Returns:
            DepartmentResponse with updated department data.

        Raises:
            HTTPException 404: If department not found.
            HTTPException 409: If new name conflicts with another department.
        """

        # Fetch the department to update
        result = await db.execute(
            select(Department).where(Department.id == dept_id)
        )
        dept = result.scalar_one_or_none()

        if dept is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {dept_id} not found."
            )

        # If changing the name, check it's not taken by another department
        name_changed = False
        if dept_data.name is not None and dept_data.name != dept.name:
            name_check = await db.execute(
                select(Department).where(
                    Department.name == dept_data.name,
                    Department.id != dept_id  # Exclude current dept
                )
            )
            if name_check.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A department named '{dept_data.name}' already exists."
                )
            dept.name = dept_data.name
            name_changed = True

        # Apply other optional updates
        if dept_data.description is not None:
            dept.description = dept_data.description
        if dept_data.location is not None:
            dept.location = dept_data.location
        if dept_data.phone is not None:
            dept.phone = dept_data.phone

        # Save changes
        await db.flush()
        await db.refresh(dept)

        # Sync to Qdrant vector database (fail silently to avoid blocking DB transaction)
        from app.services.rag_service import RAGService
        try:
            await RAGService.sync_department(db=db, dept_id=dept.id)
            if name_changed:
                # If department name changed, we must re-embed all doctors in this department
                # because their doctor embeddings include the department name.
                doctors_result = await db.execute(
                    select(Doctor).where(Doctor.department_id == dept.id)
                )
                doctors = doctors_result.scalars().all()
                for doc in doctors:
                    await RAGService.sync_doctor(db=db, doctor_id=doc.id)
        except Exception:
            pass

        # Get fresh doctor count for the response
        doc_count_result = await db.execute(
            select(func.count(Doctor.id)).where(Doctor.department_id == dept.id)
        )
        doc_count = doc_count_result.scalar_one()

        return DepartmentResponse(
            **{k: v for k, v in dept.__dict__.items() if not k.startswith("_")},
            doctor_count=doc_count
        )

    # --------------------------------------------------------------------------
    # DELETE DEPARTMENT
    # WHY: Allows admins to remove a department from the system.
    #      Because of the CASCADE delete on Doctor.department_id, all doctors
    #      in this department will also be deleted from the database.
    # WHAT: Deletes the department (and cascades to its doctors).
    # INPUT:
    #   - db: AsyncSession → database session
    #   - dept_id: int → the department to delete
    # OUTPUT: Dict with success message
    #         Raises HTTP 404 if not found
    # --------------------------------------------------------------------------
    @staticmethod
    async def delete_department(
        db: AsyncSession,
        dept_id: int
    ) -> dict:
        """
        Permanently deletes a department and all its associated doctors.
        Uses CASCADE delete — all doctors in this department are also removed.

        Args:
            db: Async database session.
            dept_id: ID of the department to delete.

        Returns:
            A dict with a success message.

        Raises:
            HTTPException 404: If the department is not found.
        """

        # Fetch the department
        result = await db.execute(
            select(Department).where(Department.id == dept_id)
        )
        dept = result.scalar_one_or_none()

        if dept is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {dept_id} not found."
            )

        dept_name = dept.name

        # Sync deletion to Qdrant vector database (fail silently to avoid blocking DB transaction)
        from app.services.rag_service import RAGService
        try:
            # 1. Delete doctor embeddings under this department (cascade equivalent)
            doctors_result = await db.execute(
                select(Doctor.id).where(Doctor.department_id == dept_id)
            )
            doc_ids = doctors_result.scalars().all()
            for doc_id in doc_ids:
                await RAGService.delete_doctor_embedding(doctor_id=doc_id)
            # 2. Delete department embedding
            await RAGService.delete_department_embedding(dept_id=dept_id)
        except Exception:
            pass

        # Delete the department — CASCADE will remove associated doctors
        await db.delete(dept)
        await db.flush()

        return {
            "message": f"Department '{dept_name}' and all its associated doctors have been deleted."
        }
