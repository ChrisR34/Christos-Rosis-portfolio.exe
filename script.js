document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contactForm');

  if (!form) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !message) {
      return;
    }

    const subject = encodeURIComponent('Portfolio contact from ' + name);
    const body = encodeURIComponent(
      'Name: ' + name + '\n' +
      'Email: ' + email + '\n\n' +
      'Message:\n' + message
    );

    window.location.href = 'mailto:christosrosis@yahoo.com?subject=' + subject + '&body=' + body;
  });
});
