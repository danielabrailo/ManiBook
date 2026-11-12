from django.db import transaction
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from .models import PowderPhoto, ManicurePhoto, DesignPhoto


PHOTO_MODELS = (PowderPhoto, ManicurePhoto, DesignPhoto)


def delete_file_after_commit(storage, file_name):
    """
    Delete a stored file only after the database transaction commits.
    """
    if file_name:
        transaction.on_commit(
            lambda: storage.delete(file_name)
        )


def get_previous_image(sender, instance):
    """
    Retrieve the existing image before an instance is updated.
    """
    if not instance.pk:
        return None

    try:
        old_instance = sender.objects.only("image").get(pk=instance.pk)
        return old_instance.image
    except sender.DoesNotExist:
        return None


def connect_image_cleanup_signals():
    """
    Register image cleanup signals for all photo models.
    """
    for model in PHOTO_MODELS:

        pre_save.connect(
            capture_previous_image,
            sender=model,
            weak=False,
            dispatch_uid=f"{model.__name__}_capture_previous_image",
        )

        post_save.connect(
            delete_replaced_image,
            sender=model,
            weak=False,
            dispatch_uid=f"{model.__name__}_delete_replaced_image",
        )

        post_delete.connect(
            delete_deleted_image,
            sender=model,
            weak=False,
            dispatch_uid=f"{model.__name__}_delete_deleted_image",
        )


def capture_previous_image(sender, instance, **kwargs):
    old_image = get_previous_image(sender, instance)

    instance._old_image_name = old_image.name if old_image else None
    instance._old_image_storage = old_image.storage if old_image else None


def delete_replaced_image(sender, instance, created, **kwargs):
    old_name = getattr(instance, "_old_image_name", None)
    old_storage = getattr(instance, "_old_image_storage", None)

    new_name = instance.image.name if instance.image else None

    if old_name and old_name != new_name:
        delete_file_after_commit(old_storage, old_name)


def delete_deleted_image(sender, instance, **kwargs):
    if instance.image:
        delete_file_after_commit(
            instance.image.storage,
            instance.image.name,
        )


connect_image_cleanup_signals()