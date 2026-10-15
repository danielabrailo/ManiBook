from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Powder
from .serializers import PowderSerializer


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
        return Powder.objects.filter(owner=self.request.user)