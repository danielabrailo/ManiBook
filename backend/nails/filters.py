import django_filters

from .models import Manicure, Tag


class ManicureFilter(django_filters.FilterSet):
    tags = django_filters.CharFilter(method="filter_tags")

    class Meta:
        model = Manicure
        fields = [
            "nail_shape",
            "technique",
            "nail_length",
            "rating",
        ]

    def filter_tags(self, queryset, name, value):
        if not value:
            return queryset

        try:
            tag_ids = {
                int(tag_id)
                for tag_id in value.split(",")
                if tag_id.strip()
            }
        except ValueError:
            return queryset.none()

        if not tag_ids:
            return queryset

        # Only allow tags belonging to the authenticated user.
        user_tags = Tag.objects.filter(
            owner=self.request.user,
            id__in=tag_ids,
        )

        return queryset.filter(tags__in=user_tags).distinct()