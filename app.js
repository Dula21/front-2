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
                return;
            }
        
            // Check if the ZIP code is numerical
            if (!/^\d+$/.test(this.order.zip)) {
                alert("Please enter a valid ZIP code (numbers only).");
                return;
            }
        
            // Ensure the cart is not empty
            if (!this.cart.length) {
                alert("Your cart is empty. Add an item before placing an order.");
                return;
            }
        
            // Prepare the order data
            const orderData = {
                lessons: this.cart.map(item => ({
                    lessonId: item._id || item.id, // Use MongoDB ObjectId if available
                    quantity: item.quantity,
                })),
                customerDetails: {
                    firstName: this.order.firstName,
                    lastName: this.order.lastName,
                    address: this.order.address,
                    city: this.order.city,
                    zip: this.order.zip,
                    state: this.order.state,
                    type: this.order.type,
                },
            };
        
            try {
                // Send the order data to the backend API
                const orderResponse = await fetch('http://localhost:3000/collection/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData),
                });
        
                if (!orderResponse.ok) {
                    const errorText = await orderResponse.text();
                    const errorMessage = this.parseErrorMessage(errorText, 'Failed to place the order.');
                    throw new Error(errorMessage);
                }
        
                const orderResult = await orderResponse.json();
                console.log('Order placed successfully:', orderResult);
        
                // Update inventory for each lesson in the cart
                for (const item of this.cart) {
                    const lessonId = item._id || item.id;
        
                    const inventoryResponse = await fetch(`http://localhost:3000/collection/lessons/${lessonId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ availableInventory: item.availableInventory }),
                    });
        
                    if (!inventoryResponse.ok) {
                        const errorText = await inventoryResponse.text();
                        const errorMessage = this.parseErrorMessage(
                            errorText,
                            `Failed to update inventory for lesson ${lessonId}.`
                        );
                        throw new Error(errorMessage);
                    }
        
                    const inventoryResult = await inventoryResponse.json();
                    console.log(`Inventory updated for lesson ${lessonId}:`, inventoryResult);
                }
        
                // Clear the order form fields and cart
                this.order = {
                    firstName: '',
                    lastName: '',
                    address: '',
                    city: '',
                    zip: '',
                    state: '',
                    type: '',
                };
                this.cart = [];
                this.showLessons = true;
        
                // Show success message
                alert(orderResult.message || 'Order placed successfully!');
        
            } catch (error) {
                console.error('Error submitting order:', error);
                alert(error.message || 'Failed to place the order. Please try again later.');
            }
        },
        
        parseErrorMessage(responseText, defaultMessage) {
            try {
                const errorData = JSON.parse(responseText);
                return errorData.message || defaultMessage;
            } catch {
                return responseText || defaultMessage;
            }
        },
        
        updateAvailableInventory() {
            this.cart.forEach(item => {
                const lessonId = item._id || item.id; // Use the MongoDB ObjectId if available
        
                fetch(`http://localhost:3000/collection/lessons/${lessonId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ availableInventory: item.availableInventory }),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to update inventory for lesson ${lessonId}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log(`Inventory updated for lesson ${lessonId}:`, data);
                })
                .catch(error => {
                    console.error(`Error updating inventory for lesson ${lessonId}:`, error);
                });
            });
        },
        
        cartCount(lessonId) {
            let count = 0;
            for (let i = 0; i < this.cart.length; i++) {
                if (this.cart[i].id === lessonId) {
                    count++;
                }
            }
            return count;
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
