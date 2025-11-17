// Process VIN (convert O to 0 and uppercase)
export const processVin = (vin) => {
  return vin.toUpperCase().replace(/O/g, '0');
};

// Validate VIN length (must be 17 characters)
export const validateVinLength = (vin) => {
  const processed = processVin(vin);
  return processed.length === 17;
};

// Format date
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Get today's date in YYYY-MM-DD format
export const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Scroll to top smoothly
export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

// Show toast notification (using UIkit)
export const showNotification = (message, status = 'primary') => {
  if (window.UIkit) {
    window.UIkit.notification({
      message,
      status,
      pos: 'top-right',
      timeout: 5000,
    });
  }
};
