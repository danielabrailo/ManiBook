from rest_framework import serializers
from .models import Powder


class PowderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Powder
        exclude = ["owner"]

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)