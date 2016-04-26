# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import re

from django import forms
from django.core.validators import EMPTY_VALUES
from django.utils.encoding import smart_text

from lib.l10n_utils.dotlang import _lazy as _

from bedrock.newsletter.forms import NewsletterFooterForm


class USPhoneNumberField(forms.CharField):
    """A form field that validates input as a U.S. phone number.

    Note: The default 'invalid' error message serves as a placeholder and is not
    currently in use or localized.
    """
    default_error_messages = {
        'invalid': _("Sorry. This number isn't valid. Please enter a U.S. phone "
                     'number or <a href="%s">'
                     'download directly from Google Play.</a>') % 'http://mzl.la/OgZo6k',
    }

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 14)
        super(USPhoneNumberField, self).__init__(*args, **kwargs)

    def clean(self, value):
        super(USPhoneNumberField, self).clean(value)
        if value in EMPTY_VALUES:
            return ''

        value = re.sub(r'\D+', '', smart_text(value))
        if len(value) == 10:
            value = '1' + value
        elif len(value) != 11 or value[0] != '1':
            raise forms.ValidationError(self.error_messages['invalid'])

        return value


class SendToDeviceWidgetForm(forms.Form):
    number = USPhoneNumberField(required=False)
    email = forms.EmailField(max_length=100, required=False)
    platform = forms.ChoiceField(choices=(
        ('ios', 'ios'),
        ('android', 'android'),
        ('all', 'all'),
    ))


class TestFlightForm(NewsletterFooterForm):
    def __init__(self, newsletters, data=None, *args, **kwargs):
        # send empty locale as country not required & shouldn't be auto-selected
        super(TestFlightForm, self).__init__(newsletters, '', data, *args, **kwargs)

        self.fields['first_name'].widget.attrs['required'] = 'required'
        self.fields['first_name'].widget.attrs['data-placeholder'] = _('First name')

        self.fields['last_name'].widget.attrs['required'] = 'required'
        self.fields['last_name'].widget.attrs['data-placeholder'] = _('Last name')

        self.fields['email'].widget.attrs['data-placeholder'] = _('Email')

        self.fields['country'].widget.attrs.pop('required', None)
        self.fields['country'].widget.attrs.pop('aria-required', None)
