/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// create namespace
if (typeof window.Mozilla === 'undefined') {
    window.Mozilla = {};
}

Mozilla.TestFlightForm = function(formId) {
    'use strict';

    var isIELT9 = window.Mozilla.Client.platform === 'windows' && /MSIE\s[1-8]\./.test(navigator.userAgent);

    this.$form = $(formId);
    this.$fieldsets = this.$form.find('.testflight-fieldset');
    this.$fields = this.$fieldsets.find('input, select');

    this.enhanced = false;

    this.$errors = $('#testflight-errors');
    this.$errorlist = this.$errors.find('.errorlist');
    this.$submitButton = $('#testflight-submit');
    this.$spinnerTarget = $('#testflight-spinner');
    this.$thanks = $('#testflight-form-thankyou');
    this.spinner = new window.Spinner({
        lines: 12, // The number of lines to draw
        length: 4, // The length of each line
        width: 2, // The line thickness
        radius: 8, // The radius of the inner circle
        corners: 0, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#fff', // #rgb or #rrggbb or array of colors
        speed: 1, // Rounds per second
        trail: 60, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: true // Whether to use hardware acceleration
    });

    // skip enhancement for older browsers
    if (!isIELT9) {
        this.queryMobileViewport = matchMedia('(max-width: 760px)');

        if (this.queryMobileViewport.matches) {
            this.enhance();
        }

        this.queryMobileViewport.addListener(function(mq) {
            if (mq.matches && !this.enhanced) {
                this.enhance();
            } else {
                this.dehance();
            }
        }.bind(this));
    }

    // bind up the AJAXing
    // IE 8 and below don't support .bind :(
    this.$form.on('submit.testflightform', { self: this }, this.handleSubmit);

    return this.$form;
};

Mozilla.TestFlightForm.prototype.handleSubmit = function(e) {
    e.preventDefault();

    var self = e.data.self;

    self.$errors.hide();
    self.$errorlist.empty();

    // have to collect data before disabling inputs
    var formData = self.$form.serialize();
    self.disableForm();

    $.ajax(self.$form.attr('action'), {
        'method': 'post',
        'data': formData,
        'dataType': 'json'
    }).done(function (data) {
        if (data.success) {
            var formHeight = self.$form.css('height');

            // set the min-height of the thank you message
            // to the height of the form to stop page height
            // jumping on success
            self.$thanks.css('min-height', formHeight);
            self.$form.hide();

            // enableForm to cancel interval and enable form elements.
            // if page is refreshed and form elements are disabled,
            // they will be disabled after refresh.
            self.enableForm();

            // hides intro heading for tablet/mobile
            $('#intro').addClass('submitted');

            // show the thank you message
            self.$thanks.show();

            Mozilla.smoothScroll({
                top: self.$thanks.offset().top - 100
            });

            // track signup in GA
            var newsletter = $('input[name="newsletters"]').val();
            window.dataLayer.push({
                'event': 'newsletter-signup-success',
                'newsletter': newsletter
            });
        } else if (data.errors) {
            for (var i = 0; i < data.errors.length; i++) {
                self.$errorlist.append('<li>' + data.errors[i] + '</li>');
            }

            self.$errors.show();
            self.enableForm();
        }
    }).fail(function () {
        // shouldn't need l10n. This should almost never happen.
        self.$errorlist.append('<li>An unknown error occurred. Please try again later</li>');
        self.$errors.show();
        self.enableForm();
    });
};

Mozilla.TestFlightForm.prototype.enableForm = function() {
    this.$form.removeClass('loading');
    this.$form.find('input, select').prop('disabled', false);
    this.spinner.stop();
    this.$spinnerTarget.hide();
};

Mozilla.TestFlightForm.prototype.disableForm = function() {
    this.$form.addClass('loading');
    this.$form.find('input, select').prop('disabled', true);
    this.spinner.spin(this.$spinnerTarget.show()[0]);
};

Mozilla.TestFlightForm.prototype.enhance = function() {
    this.enhanced = true;

    // enable placeholder as label when input not focused
    this.$fields.each(function(i, field) {
        var $field = $(field);
        $field.attr('placeholder', $field.data('placeholder'));
    });

    this.$fields.on('focus.testflightform', function() {
        var $this = $(this);
        var $parent = $this.parent('.field');

        // get rid of placeholder on focus, as label is shown instead
        $this.attr('placeholder', '');

        // always display the label when focused
        $parent.addClass('labeled');

        // if not currently invalid, add normal focus highlight
        if (!$parent.hasClass('invalid')) {
            $parent.addClass('focused');
        }
    }).on('blur.testflightform', function() {
        var $this = $(this);
        var $parent = $this.parent('.field');

        // if nothing entered, hide label and re-enable placeholder
        if ($this.val() === '') {
            $parent.removeClass('labeled');
            $this.attr('placeholder', $this.data('placeholder'));
        }

        // invalid should only occur after pressing submit
        $parent.removeClass('focused invalid');
    }).on('invalid.testflightform', function() {
        $(this).parent('.field').addClass('invalid');
    });
};

Mozilla.TestFlightForm.prototype.dehance = function() {
    this.enhanced = false;

    // unbind all the things
    this.$fields.off('.testflightform');
    this.$fields.attr('placeholder', '');
};

(function() {
    'use strict';

    new Mozilla.TestFlightForm('#testflight-form');
})();
