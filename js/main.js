(function () {

      /* ---------- Configuration ---------- */
      /* Change the salon's WhatsApp number in this ONE place - every
         WhatsApp link and button on the page reads from it. */
      var WHATSAPP_NUMBER = "919876543210"; // digits only, country code first, no + or spaces
      var GENERIC_MESSAGE = "Hi, I'd like to book an appointment.";

      function waLink(message) {
        var base = "https://wa.me/" + WHATSAPP_NUMBER;
        return message ? base + "?text=" + encodeURIComponent(message) : base;
      }

      // Fill in every static WhatsApp link/button on the page (hero button,
      // floating bubble, sticky mobile bar, footer icon). The appointment
      // form's own WhatsApp link is built separately, below, once it knows
      // the booking details.
      document.querySelectorAll('[data-whatsapp-generic]').forEach(function (el) {
        el.href = waLink(GENERIC_MESSAGE);
      });
      document.querySelectorAll('[data-whatsapp-plain]').forEach(function (el) {
        el.href = waLink();
      });

      /* ---------- Navbar ---------- */

      var navbar = document.getElementById('navbar');
      window.addEventListener('scroll', function () {
        if (window.scrollY > 40) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      });

      var navToggle = document.getElementById('nav-toggle');
      var navMobile = document.getElementById('nav-mobile');
      navToggle.addEventListener('click', function () {
        var isOpen = navMobile.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      navMobile.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          navMobile.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        });
      });

      /* ---------- Before / after compare ---------- */

      function initCompare(root) {
        var range = root.querySelector('.compare-range');
        var dragging = false;

        function clamp(value, min, max) {
          return Math.min(max, Math.max(min, value));
        }

        function setPosition(percent) {
          percent = clamp(percent, 0, 100);
          root.style.setProperty('--pos', percent + '%');
          range.value = percent;
        }

        function percentFromClientX(clientX) {
          var rect = root.getBoundingClientRect();
          return ((clientX - rect.left) / rect.width) * 100;
        }

        root.addEventListener('pointerdown', function (e) {
          dragging = true;
          if (root.setPointerCapture) root.setPointerCapture(e.pointerId);
          setPosition(percentFromClientX(e.clientX));
        });

        root.addEventListener('pointermove', function (e) {
          if (!dragging) return;
          setPosition(percentFromClientX(e.clientX));
        });

        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (evt) {
          root.addEventListener(evt, function () { dragging = false; });
        });

        range.addEventListener('input', function () {
          root.style.setProperty('--pos', range.value + '%');
        });
      }

      document.querySelectorAll('[data-compare]').forEach(initCompare);

      /* ---------- Service / package pre-select ---------- */

      var serviceSelect = document.getElementById('af-service');
      document.querySelectorAll('[data-service]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var value = btn.getAttribute('data-service');
          serviceSelect.value = value;
          document.getElementById('appointment').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      /* ---------- Gallery lightbox ---------- */

      var galleryItems = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
      var galleryImages = galleryItems.map(function (item) {
        var img = item.querySelector('img');
        return { src: img.src, alt: img.alt };
      });

      var lightbox = document.getElementById('lightbox');
      var lightboxImg = document.getElementById('lightbox-img');
      var currentIndex = 0;

      function updateLightbox() {
        lightboxImg.src = galleryImages[currentIndex].src;
        lightboxImg.alt = galleryImages[currentIndex].alt;
      }

      function openLightbox(index) {
        currentIndex = index;
        updateLightbox();
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      }

      function closeLightbox() {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
      }

      function showNext() {
        currentIndex = (currentIndex + 1) % galleryImages.length;
        updateLightbox();
      }

      function showPrev() {
        currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
        updateLightbox();
      }

      galleryItems.forEach(function (item, i) {
        item.addEventListener('click', function () { openLightbox(i); });
      });

      document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
      document.getElementById('lightbox-next').addEventListener('click', showNext);
      document.getElementById('lightbox-prev').addEventListener('click', showPrev);

      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) closeLightbox();
      });

      document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
      });

      /* ---------- Appointment form -> confirmation card -> WhatsApp ---------- */

      var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      // Human-readable, for the on-screen confirmation card: "15 September 2026"
      function formatDateLong(value) {
        if (!value) return "";
        var parts = value.split("-"); // yyyy-mm-dd
        var day = parseInt(parts[2], 10);
        var month = months[parseInt(parts[1], 10) - 1];
        return day + " " + month + " " + parts[0];
      }

      // dd/mm/yyyy, for the WhatsApp message text
      function formatDateSlash(value) {
        if (!value) return "";
        var parts = value.split("-"); // yyyy-mm-dd
        return parts[2] + "/" + parts[1] + "/" + parts[0];
      }

      var appointmentForm = document.getElementById('appointment-form');
      var confirmCard = document.getElementById('appt-confirm');
      var whatsappLink = document.getElementById('appt-whatsapp-link');
      var noteRow = document.getElementById('conf-note-row');

      appointmentForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var name = document.getElementById('af-name').value.trim();
        var phone = document.getElementById('af-phone').value.trim();
        var service = document.getElementById('af-service').value;
        var date = document.getElementById('af-date').value;
        var time = document.getElementById('af-time').value;
        var note = document.getElementById('af-note').value.trim();

        if (!name || !phone || !service || !date || !time) {
          this.reportValidity();
          return;
        }

        // Fill in the confirmation card so the customer can check the
        // details before anything is sent.
        document.getElementById('conf-name').textContent = name;
        document.getElementById('conf-service').textContent = service;
        document.getElementById('conf-date').textContent = formatDateLong(date);
        document.getElementById('conf-time').textContent = time;

        if (note) {
          document.getElementById('conf-note').textContent = note;
          noteRow.hidden = false;
        } else {
          noteRow.hidden = true;
        }

        // Build the exact message the salon owner will receive on WhatsApp.
        var lines = [
          "Hi LUXE Studio 👋",
          "",
          "I would like to book an appointment.",
          "",
          "👤 Name: " + name,
          "📱 Phone: " + phone,
          "✂️ Service: " + service,
          "📅 Date: " + formatDateSlash(date),
          "🕐 Time: " + time
        ];
        if (note) {
          lines.push("📝 Note: " + note);
        }
        lines.push("", "Please confirm my appointment.");

        var message = lines.join("\n");
        whatsappLink.href = waLink(message);

        appointmentForm.hidden = true;
        confirmCard.hidden = false;
        confirmCard.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      document.getElementById('appt-edit').addEventListener('click', function () {
        confirmCard.hidden = true;
        appointmentForm.hidden = false;
        appointmentForm.scrollIntoView({ behavior: "smooth", block: "start" });
      });

})();
