from rest_framework import serializers
from .models import Powder, Manicure, PowderPhoto


class PowderSerializer(serializers.ModelSerializer):
    primary_photo = serializers.SerializerMethodField()

    class Meta:
        model = Powder
        exclude = ["owner"]

    def get_primary_photo(self, obj):
        photos = getattr(obj, "primary_product_photos", [])

        if not photos:
            return None

        photo = photos[0]

        if not photo.image:
            return None

        return photo.image.url

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)

class ManicureSerializer(serializers.ModelSerializer):
    powders = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Powder.objects.none(),
        required=False,
    )

    class Meta:
        model = Manicure
        fields = [
            "id",
            "title",
            "completed_at",
            "nail_shape",
            "technique",
            "nail_length",
            "notes",
            "wear_duration_days",
            "removal_date",
            "powders",
        ]
        read_only_fields = ["id"]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            fields["powders"].queryset = Powder.objects.filter(
                owner=request.user
            )

        return fields

    def validate(self, attrs):
        completed_at = attrs.get(
            "completed_at",
            getattr(self.instance, "completed_at", None),
        )
        removal_date = attrs.get(
            "removal_date",
            getattr(self.instance, "removal_date", None),
        )

        if completed_at and removal_date and removal_date < completed_at:
            raise serializers.ValidationError({
                "removal_date": "Removal date cannot be before completion."
            })

        return attrs

class PowderPhotoSerializer(serializers.ModelSerializer):
    powder = serializers.PrimaryKeyRelatedField(
        queryset=Powder.objects.none()
    )

    class Meta:
        model = PowderPhoto
        fields = [
            "id",
            "powder",
            "image",
            "photo_type",
            "caption",
            "is_primary",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            fields["powder"].queryset = Powder.objects.filter(
                owner=request.user
            )

        return fields

    def validate_image(self, image):
        max_size = 5 * 1024 * 1024  # 5 MB

        if image.size > max_size:
            raise serializers.ValidationError(
                "Image size cannot exceed 5 MB."
            )

        return image