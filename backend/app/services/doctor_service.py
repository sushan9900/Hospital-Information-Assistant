# ==============================================================================
# Hospital Information Assistance — Doctor Service
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Contains all business logic for doctor management.
#   Doctor records are a key data source for the RAG system — doctor bios,
#   specializations, and availability are embedded into Qdrant for semantic
#   search queries like "experienced cardiologist available on Monday".
#
# OPERATIONS:
#   - create_doctor()    → Add a new doctor profile (admin only)
#   - get_all_doctors()  → Paginated list with filters
#   - get_doctor_by_id() → Single doctor with department info
#   - update_doctor()    → Partial update (admin only)
#   - delete_doctor()    → Remove a doctor (admin only)
#   - search_doctors()   → Search by name/specialization
# ==============================================================================

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from typing import Optional

from app.models.doctor import Doctor
from app.models.department import Department
from app.schemas.doctor import (
    DoctorCreate,
    DoctorUpdate,
    DoctorResponse,
    DoctorListResponse,
    DepartmentBrief
)


# ==============================================================================
# DOCTOR SERVICE CLASS
# ==============================================================================
class DoctorService:

    # --------------------------------------------------------------------------
    # CREATE DOCTOR
    # WHY: Allows admins to add new doctor profiles to the system.
    # WHAT: Validates the department exists, checks email uniqueness,
    #       then creates the doctor record.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - doctor_data: DoctorCreate → validated doctor data from request
    # OUTPUT: DoctorResponse with the newly created doctor
    #         Raises HTTP 404 if department not found
    #         Raises HTTP 409 if email already exists
    # --------------------------------------------------------------------------
    @staticmethod
    async def create_doctor(
        db: AsyncSession,
        doctor_data: DoctorCreate
    ) -> DoctorResponse:
        """
        Creates a new doctor profile.

        Steps:
        1. Verify the department exists
        2. Check email uniqueness (if provided)
        3. Insert the new doctor into the database
        4. Return the doctor with nested department info

        Args:
            db: Async database session.
            doctor_data: Validated doctor creation data from request body.

        Returns:
            DoctorResponse with the new doctor and department info.

        Raises:
            HTTPException 404: If the specified department does not exist.
            HTTPException 409: If a doctor with that email already exists.
        """

        # Step 1: Verify the department exists
        dept_result = await db.execute(
            select(Department).where(Department.id == doctor_data.department_id)
        )
        department = dept_result.scalar_one_or_none()

        if department is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {doctor_data.department_id} not found."
            )

        # Step 2: Check email uniqueness if provided
        if doctor_data.email is not None:
            email_check = await db.execute(
                select(Doctor).where(Doctor.email == doctor_data.email)
            )
            if email_check.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A doctor with email '{doctor_data.email}' already exists."
                )

        # Step 3: Create the new Doctor model instance
        new_doctor = Doctor(
            full_name=doctor_data.full_name,
            specialization=doctor_data.specialization,
            qualification=doctor_data.qualification,
            experience_years=doctor_data.experience_years,
            department_id=doctor_data.department_id,
            email=doctor_data.email,
            phone=doctor_data.phone,
            bio=doctor_data.bio,
            consultation_fee=doctor_data.consultation_fee,
            available_days=doctor_data.available_days
        )

        # Step 4: Save to database
        db.add(new_doctor)
        await db.flush()
        await db.refresh(new_doctor)

        # Step 5: Return response with nested department info
        return DoctorResponse(
            **{k: v for k, v in new_doctor.__dict__.items() if not k.startswith("_") and k != "department"},
            department=DepartmentBrief(id=department.id, name=department.name)
        )

    # --------------------------------------------------------------------------
    # GET ALL DOCTORS
    # WHY: Returns a paginated list of all doctors for the doctors page.
    #      Supports filtering by department and specialization.
    # WHAT: Queries doctors with their department, applies optional filters.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - skip: int → pagination offset
    #   - limit: int → max records per page
    #   - department_id: Optional[int] → filter by department
    #   - specialization: Optional[str] → filter by specialization (partial match)
    #   - search: Optional[str] → search by name or specialization
    # OUTPUT: DoctorListResponse with total and doctors list
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_all_doctors(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 10,
        department_id: Optional[int] = None,
        specialization: Optional[str] = None,
        search: Optional[str] = None
    ) -> DoctorListResponse:
        """
        Returns a paginated list of doctors with optional filters.

        Args:
            db: Async database session.
            skip: Pagination offset.
            limit: Max records per page.
            department_id: Filter by department ID.
            specialization: Filter by specialization (partial, case-insensitive).
            search: Search across name and specialization fields.

        Returns:
            DoctorListResponse with total count and doctors list.
        """

        # Base query with eager loading of department
        query = select(Doctor).options(selectinload(Doctor.department))

        # Apply department filter
        if department_id is not None:
            query = query.where(Doctor.department_id == department_id)

        # Apply specialization filter (partial match, case-insensitive)
        if specialization is not None:
            query = query.where(
                Doctor.specialization.ilike(f"%{specialization}%")
            )

        # Apply name/specialization search
        if search is not None:
            query = query.where(
                or_(
                    Doctor.full_name.ilike(f"%{search}%"),
                    Doctor.specialization.ilike(f"%{search}%")
                )
            )

        # Get total count of filtered results
        count_result = await db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        # Fetch paginated results, ordered by name
        result = await db.execute(
            query.offset(skip).limit(limit).order_by(Doctor.full_name)
        )
        doctors = result.scalars().all()

        # Build response list with nested department info
        doctor_responses = []
        for doc in doctors:
            dept_brief = None
            if doc.department:
                dept_brief = DepartmentBrief(
                    id=doc.department.id,
                    name=doc.department.name
                )

            doctor_responses.append(
                DoctorResponse(
                    **{k: v for k, v in doc.__dict__.items() if not k.startswith("_") and k != "department"},
                    department=dept_brief
                )
            )

        return DoctorListResponse(total=total, doctors=doctor_responses)

    # --------------------------------------------------------------------------
    # GET DOCTOR BY ID
    # WHY: Returns a single doctor's full profile for the detail page.
    # WHAT: Fetches doctor by ID with department eagerly loaded.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - doctor_id: int → the doctor's primary key
    # OUTPUT: DoctorResponse with full doctor info + department brief
    #         Raises HTTP 404 if not found
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_doctor_by_id(
        db: AsyncSession,
        doctor_id: int
    ) -> DoctorResponse:
        """
        Fetches a single doctor by their database ID.

        Args:
            db: Async database session.
            doctor_id: The doctor's database ID.

        Returns:
            DoctorResponse with full profile and department info.

        Raises:
            HTTPException 404: If no doctor with that ID exists.
        """

        result = await db.execute(
            select(Doctor)
            .where(Doctor.id == doctor_id)
            .options(selectinload(Doctor.department))  # Eager load department
        )
        doctor = result.scalar_one_or_none()

        if doctor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor with ID {doctor_id} not found."
            )

        dept_brief = None
        if doctor.department:
            dept_brief = DepartmentBrief(
                id=doctor.department.id,
                name=doctor.department.name
            )

        return DoctorResponse(
            **{k: v for k, v in doctor.__dict__.items() if not k.startswith("_") and k != "department"},
            department=dept_brief
        )

    # --------------------------------------------------------------------------
    # UPDATE DOCTOR
    # WHY: Allows admins to edit doctor profiles (partial update).
    # WHAT: Applies only the provided fields, validates dept/email if changed.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - doctor_id: int → the doctor to update
    #   - doctor_data: DoctorUpdate → fields to update (all optional)
    # OUTPUT: DoctorResponse with updated data
    #         Raises HTTP 404 if doctor or new department not found
    #         Raises HTTP 409 if new email conflicts with another doctor
    # --------------------------------------------------------------------------
    @staticmethod
    async def update_doctor(
        db: AsyncSession,
        doctor_id: int,
        doctor_data: DoctorUpdate
    ) -> DoctorResponse:
        """
        Partially updates a doctor's profile.
        Only provided fields are updated — omitted fields stay unchanged.

        Args:
            db: Async database session.
            doctor_id: ID of the doctor to update.
            doctor_data: Fields to update (all optional).

        Returns:
            DoctorResponse with updated doctor data.

        Raises:
            HTTPException 404: If the doctor or new department is not found.
            HTTPException 409: If the new email is already used by another doctor.
        """

        # Fetch doctor with department
        result = await db.execute(
            select(Doctor)
            .where(Doctor.id == doctor_id)
            .options(selectinload(Doctor.department))
        )
        doctor = result.scalar_one_or_none()

        if doctor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor with ID {doctor_id} not found."
            )

        # Validate new department if provided
        if doctor_data.department_id is not None:
            dept_result = await db.execute(
                select(Department).where(Department.id == doctor_data.department_id)
            )
            if dept_result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with ID {doctor_data.department_id} not found."
                )
            doctor.department_id = doctor_data.department_id

        # Validate new email uniqueness if provided
        if doctor_data.email is not None and doctor_data.email != doctor.email:
            email_check = await db.execute(
                select(Doctor).where(
                    Doctor.email == doctor_data.email,
                    Doctor.id != doctor_id
                )
            )
            if email_check.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Email '{doctor_data.email}' is already used by another doctor."
                )
            doctor.email = doctor_data.email

        # Apply remaining optional field updates
        if doctor_data.full_name is not None:
            doctor.full_name = doctor_data.full_name
        if doctor_data.specialization is not None:
            doctor.specialization = doctor_data.specialization
        if doctor_data.qualification is not None:
            doctor.qualification = doctor_data.qualification
        if doctor_data.experience_years is not None:
            doctor.experience_years = doctor_data.experience_years
        if doctor_data.phone is not None:
            doctor.phone = doctor_data.phone
        if doctor_data.bio is not None:
            doctor.bio = doctor_data.bio
        if doctor_data.consultation_fee is not None:
            doctor.consultation_fee = doctor_data.consultation_fee
        if doctor_data.available_days is not None:
            doctor.available_days = doctor_data.available_days

        # Save changes and refresh
        await db.flush()
        await db.refresh(doctor)

        # Reload department for response (in case it changed)
        dept_result = await db.execute(
            select(Department).where(Department.id == doctor.department_id)
        )
        department = dept_result.scalar_one_or_none()
        dept_brief = DepartmentBrief(
            id=department.id, name=department.name
        ) if department else None

        return DoctorResponse(
            **{k: v for k, v in doctor.__dict__.items() if not k.startswith("_") and k != "department"},
            department=dept_brief
        )

    # --------------------------------------------------------------------------
    # DELETE DOCTOR
    # WHY: Allows admins to remove a doctor from the system.
    #      Note: appointments linked to this doctor will also be deleted (CASCADE).
    # WHAT: Permanently deletes the doctor record.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - doctor_id: int → the doctor to delete
    # OUTPUT: Dict with success message
    #         Raises HTTP 404 if not found
    # --------------------------------------------------------------------------
    @staticmethod
    async def delete_doctor(
        db: AsyncSession,
        doctor_id: int
    ) -> dict:
        """
        Permanently deletes a doctor and all their appointments (CASCADE).

        Args:
            db: Async database session.
            doctor_id: ID of the doctor to delete.

        Returns:
            A dict with a success message.

        Raises:
            HTTPException 404: If the doctor is not found.
        """

        result = await db.execute(
            select(Doctor).where(Doctor.id == doctor_id)
        )
        doctor = result.scalar_one_or_none()

        if doctor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor with ID {doctor_id} not found."
            )

        doctor_name = doctor.full_name
        await db.delete(doctor)
        await db.flush()

        return {
            "message": f"Dr. {doctor_name} has been removed from the system."
        }
