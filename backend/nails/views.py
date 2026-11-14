from django.db.models import Prefetch
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from .filters import ManicureFilter

from .models import (
    Powder,
    PowderPhoto,
    Manicure,
    ManicurePhoto,
    Tag,
    Design,
    DesignPhoto,
)
from .serializers import (
    PowderSerializer,
    PowderPhotoSerializer,
    TagSerializer,
    ManicureSerializer,
    ManicurePhotoSerializer,
    DesignSerializer,
    DesignPhotoSerializer,
    GenerateDesignRequestSerializer,
    SaveGeneratedDesignSerializer,
)
from rest_framework.views import APIView
from rest_framework.response import Response

from .serializers import GenerateDesignRequestSerializer
from .services.ai_design import (
    select_eligible_powders,
    PowderSelectionError,
)
from nails.services.gemini_client import (
    GeminiConfigurationError,
    GeminiGenerationError,
    generate_design_plan,
)

class PowderViewSet(viewsets.ModelViewSet):
    serializer_class = PowderSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = [
        "colour_family",
        "finish",
        "intensity",
        "undertone",
        "is_favourite",
    ]

    search_fields = ["name", "brand", "product_code"]
    ordering_fields = ["name", "brand", "created_at", "updated_at"]

    def get_queryset(self):
        primary_photos = PowderPhoto.objects.filter(
            photo_type=PowderPhoto.PhotoType.PRODUCT,
            is_primary=True,
        ).order_by("-created_at", "-id")

        queryset = (
            Powder.objects
            .filter(owner=self.request.user)
            .prefetch_related(
                Prefetch(
                    "photos",
                    queryset=primary_photos,
                    to_attr="primary_product_photos",
                )
            )
        )

        # Filter by tags using OR logic.
        # Example: ?tags=1&tags=2 returns powders
        # that have either tag 1 OR tag 2.

        tag_ids = self.request.query_params.getlist("tags")

        if tag_ids:
            try:
                tag_ids = [int(tag_id) for tag_id in tag_ids]
            except (TypeError, ValueError):
                raise ValidationError({
                    "tags": "Tag IDs must be valid integers."
                })

            if any(tag_id <= 0 for tag_id in tag_ids):
                raise ValidationError({
                    "tags": "Tag IDs must be positive integers."
                })

            queryset = queryset.filter(
                tags__id__in=tag_ids,
                tags__owner=self.request.user,
            ).distinct()

        return queryset


class PowderPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = PowderPhotoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["powder", "photo_type"]

    def get_queryset(self):
        return PowderPhoto.objects.filter(
            powder__owner=self.request.user
        ).select_related("powder")

class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tag.objects.filter(
            owner=self.request.user
        )


class ManicureViewSet(viewsets.ModelViewSet):
    serializer_class = ManicureSerializer
    permission_classes = [IsAuthenticated]

    filterset_class = ManicureFilter

    search_fields = ["title", "notes"]

    ordering_fields = [
        "completed_at",
        "created_at",
        "updated_at",
        "rating",
    ]

    def get_queryset(self):
        return (
            Manicure.objects
            .filter(owner=self.request.user)
            .select_related("owner")
            .prefetch_related("powders", "tags", "photos")
            .distinct()
        )


class ManicurePhotoViewSet(viewsets.ModelViewSet):
    serializer_class = ManicurePhotoSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = ["manicure", "is_primary"]

    def get_queryset(self):
        return (
            ManicurePhoto.objects
            .filter(manicure__owner=self.request.user)
            .select_related("manicure")
        )

class DesignViewSet(viewsets.ModelViewSet):
    serializer_class = DesignSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = [
        "source",
        "status",
        "style",
        "nail_shape",
    ]

    search_fields = [
        "title",
        "style",
        "instructions",
    ]

    ordering_fields = [
        "title",
        "source",
        "status",
        "created_at",
        "updated_at",
    ]

    ordering = ["-updated_at"]

    def get_queryset(self):
        queryset = (
            Design.objects.filter(owner=self.request.user)
            .select_related("owner")
            .prefetch_related(
                "powders",
                "tags",
                "photos",
            )
        )

        # Filter by tags using OR logic.
        # Example: ?tags=1&tags=2 returns designs
        # that have either tag 1 OR tag 2.

        tag_ids = self.request.query_params.getlist("tags")

        if tag_ids:
            try:
                tag_ids = [int(tag_id) for tag_id in tag_ids]
            except (TypeError, ValueError):
                raise ValidationError({
                    "tags": "Tag IDs must be valid integers."
                })

            if any(tag_id <= 0 for tag_id in tag_ids):
                raise ValidationError({
                    "tags": "Tag IDs must be positive integers."
                })

            queryset = queryset.filter(
                tags__id__in=tag_ids,
                tags__owner=self.request.user,
            ).distinct()

        return queryset


class GenerateDesignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateDesignRequestSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        selected_powder_ids = [
            powder.id
            for powder in data.get("selected_powder_ids", [])
        ]

        # Step 1: Select powders belonging to the authenticated user.
        try:
            selection = select_eligible_powders(
                user=request.user,
                colour_mode=data["colour_mode"],
                selected_powder_ids=selected_powder_ids,
                finishes=data.get("finishes", []),
                colour_families=data.get("colour_families", []),
                undertones=data.get("undertones", []),
                favourites_only=data.get("favourites_only", False),
                limit=30,
            )

        except PowderSelectionError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 2: Build a clean set of preferences for Gemini.
        # Do not pass serializer objects or Django model instances.
        preferences = {
            "colour_mode": data["colour_mode"],
            "palette_size": data["palette_size"],
            "style": data["style"],
            "complexity": data["complexity"],
            "occasion": data["occasion"],
            "nail_shape": data.get("nail_shape") or "not specified",
            "nail_length": data.get("nail_length") or "not specified",
            "finishes": data.get("finishes", []),
            "colour_families": data.get("colour_families", []),
            "undertones": data.get("undertones", []),
            "favourites_only": data.get("favourites_only", False),
            "additional_preferences": data.get("preferences", ""),
        }

        # Step 3: Generate and validate the AI design.
        try:
            design_plan = generate_design_plan(
                preferences=preferences,
                powders=selection["powders"],
            )

        except GeminiConfigurationError:
            return Response(
                {
                    "detail": (
                        "The AI design service is not configured. "
                        "Please try again later."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except GeminiGenerationError:
            return Response(
                {
                    "detail": (
                        "We couldn't generate a valid design right now. "
                        "Please try again."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Step 4: Return only the powders actually used in the palette.
        palette_ids = {
            item["powder_id"]
            for item in design_plan["palette"]
        }

        palette_powders = [
            powder
            for powder in selection["powders"]
            if powder["id"] in palette_ids
        ]

        return Response(
            {
                "message": "Design generated successfully.",
                "design": design_plan,
                "palette_powders": palette_powders,
                "selection_summary": {
                    "total_matching": selection["total_matching"],
                    "total_eligible": selection["total_eligible"],
                    "excluded_missing_or_invalid_hex": (
                        selection["excluded_missing_or_invalid_hex"]
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )

class SaveGeneratedDesignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SaveGeneratedDesignSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        design = serializer.save()

        response_serializer = DesignSerializer(
            design,
            context={"request": request},
        )

        return Response(
            {
                "message": "AI design saved successfully.",
                "design": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

class DesignPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = DesignPhotoSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = [
        "design",
        "is_primary",
    ]

    search_fields = [
        "caption",
    ]

    ordering_fields = [
        "created_at",
    ]

    ordering = ["created_at"]

    def get_queryset(self):
        return (
            DesignPhoto.objects.filter(
                design__owner=self.request.user
            )
            .select_related("design")
        )

