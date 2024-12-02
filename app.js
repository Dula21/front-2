new Vue({
    el: '#app',
    data() {
        return {
            sitename: 'After School App',
            showLessons: true, // Toggle between lessons and checkout
            lessons: [], // Initialize lessons array
            order: {
                firstName: '',
                lastName: '',
                address: '',
                city: '',
                zip: '',
                state: '',
                type: '' // New property for order type
            },
            cart: [], // Array to hold cart items
            sortOption: 'title', // Default sort option
            searchQuery: '', // Search query
            states: [ // List of states for dropdown
                'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
                'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
                'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
                'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
                'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
                'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
                'West Virginia', 'Wisconsin', 'Wyoming'
            ]
        };
    },
    computed: {
        cartItemCount() {
            return this.cart.reduce((total, item) => total + item.quantity, 0);
        },
        filteredLessons() {
            if (!this.searchQuery) {
                return this.sortedLessons; // Return all lessons if no search query
            }
            const query = this.searchQuery.toLowerCase();
            return this.sortedLessons.filter(lesson => {
                return (
                    lesson.title.toLowerCase().includes(query) ||
                    lesson.description.toLowerCase().includes(query) ||
                    lesson.location.toLowerCase().includes(query)
                );
            });
        },
        sortedLessons() {
            const sorted = [...this.lessons]; // Create a copy of the lessons array
            if (this.sortOption === 'price') {
                return sorted.sort((a, b) => a.price - b.price); // Sort by price ascending
            } else if (this.sortOption === 'price_desc') {
                return sorted.sort((a, b) => b.price - a.price); // Sort by price descending
            } else if (this.sortOption === 'title') {
                return sorted.sort((a, b) => a.title.localeCompare(b.title)); // Sort by title A-Z
            } else if (this.sortOption === 'title_desc') {
                return sorted.sort((a, b) => b.title.localeCompare(a.title)); // Sort by title Z-A
            } else if (this.sortOption === 'location') {
                return sorted.sort((a, b) => a.location.localeCompare(b.location)); // Sort by location
            } else if (this.sortOption === 'availability') {
                return sorted.sort((a, b) => a.availableInventory - b.availableInventory); // Sort by availability
            }
            return sorted; // Default return
        }
    },
    methods: {
        toggleCheckout() {
            this.showLessons = !this.showLessons;
        },
        addToCart(lesson) {
            if (this.canAddToCart(lesson)) {
                const existingItem = this.cart.find(item => item.id === lesson.id);
                if (existingItem) {
                    existingItem.quantity++;
                } else {
                    this.cart.push({ ...lesson, quantity: 1 });
                }
                lesson.availableInventory--; // Decrement available inventory
            } else {
                alert("Cannot add more items to the cart. Out of stock!");
            }
        },
        canAddToCart(lesson) {
            return lesson.availableInventory > this.cartCount(lesson.id);
        },
        async submitOrder() {
            // Validate all input fields
            if (!this.order.firstName || !this.order.lastName || !this.order.address ||
                !this.order.city || !this.order.zip || !this.order.state || !this.order.type) {
                alert("Please fill out all required fields before submitting the order.");
                return; // Exit the method if validation fails
            }
        
            // Check if the ZIP code is numerical
            if (!/^\d+$/.test(this.order.zip)) {
                alert("Please enter a valid ZIP code (numbers only).");
                return; // Exit the method if ZIP code validation fails
            }
        
            // Ensure the cart is not empty
            if (!this.cart.length) {
                alert("Your cart is empty. Add an item before placing an order.");
                return; // Exit if the cart is empty
            }
        
            // Prepare the order data
            const orderData = {
                lessonId: this.cart[0].id, // Place an order for the first item in the cart
                quantity: this.cart[0].quantity, // Quantity of the lesson being ordered
                customerDetails: {
                    firstName: this.order.firstName,
                    lastName: this.order.lastName,
                    address: this.order.address,
                    city: this.order.city,
                    zip: this.order.zip,
                    state: this.order.state,
                    type: this.order.type
                }
            };
        
            // Send the order data to the backend API
            fetch('http://localhost:3000/collection/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        let errorMessage;
                        try {
                            const errorData = JSON.parse(text);
                            errorMessage = errorData.message || 'Failed to place the order.';
                        } catch {
                            errorMessage = text || 'Failed to place the order.';
                        }
                        throw new Error(errorMessage);
                    });
                }
                return response.json(); // Parse the successful response
            })
            .then(result => {
                alert(result.message); // Show success message
                this.updateavailableInventory(); // Call the method to update seat availability

                // Clear the order form fields and the cart
                this.order = {
                    firstName: '',
                    lastName: '',
                    address: '',
                    city: '',
                    zip: '',
                    state: '',
                    type: ''
                };
                this.cart = []; // Clear the cart after placing an order
                this.showLessons = true; // Return to lessons view after placing the order
            })
            .catch(error => {
                console.error('Error submitting order:', error);
                alert(error.message || 'Failed to place the order. Please try again later.');
            });
        },
        updateavailableInventory() {
            this.cart.forEach(lesson => {
                const updateData = {
                    availableInventory: lesson.availableInventory - lesson.quantity // Update available inventory
                };
        
                // Send PUT request to the server
                fetch(`http://localhost:3000/collection/lessons/${lesson.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            let errorMessage;
                            try {
                                const errorData = JSON.parse(text);
                                errorMessage = errorData.message || 'Failed to update seat availability.';
                            } catch {
                                errorMessage = text || 'Failed to update seat availability.';
                            }
                            throw new Error(errorMessage);
                        });
                    }
                    return response.json(); // Parse successful response
                })
                .then(result => {
                    console.log(`Seat availability updated for lesson ID: ${lesson.id}`, result);
                })
                .catch(error => {
                    console.error(`Error updating seat availability for lesson ID: ${lesson.id}`, error);
                    alert(`Failed to update seat availability for lesson "${lesson.title}". Please try again later.`);
                });
            });
        },
        cartCount(lessonId) {
            const lesson = this.cart.find(lesson => lesson.id === lessonId);
            return lesson ? lesson.quantity : 0;
        },
        setSortOption(option) {
            this.sortOption = option; // Method to set sorting option
        },
    },
    
    created() {
        console.log('Requesting data from server...');

        // Fetch lessons from the server
        fetch('http://localhost:3000/collection/lessons')
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data)) {
                    this.lessons = data; // Save lessons data to Vue instance
                    console.log('Lessons fetched:', data);
                } else {
                    console.error('Fetched data is not an array:', data);
                    alert('Unexpected data format received. Please try again later.');
                }
            })
            .catch(error => {
                console.error('Error fetching lessons:', error);
                alert('Failed to load lessons. Please try again later.');
            });
    }
});