from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import PowderPhoto


@receiver(post_delete, sender=PowderPhoto)
def delete_powder_photo_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)