from django.db.models import Prefetch
from rest_framework import viewsets
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
        return (
            Design.objects.filter(owner=self.request.user)
            .select_related("owner")
            .prefetch_related(
                "powders",
                "tags",
                "photos",
            )
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

