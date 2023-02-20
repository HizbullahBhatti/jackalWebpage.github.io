let vueApp = new Vue({
    el: "#vueApp",
    data: {
        // ros connection
        ros: null,
        rosbridge_address: 'ws://localhost:9090/',
        connected: false,
        // page content
        menu_title: 'Connection',
        main_title: 'Move the Jackal',
        // subscriber data
        position: { x: 0, y: 0, z: 0, },
        // fence mode 
        fenceMode: false,
        insideFence: false, 
        // dragging data
        dragging: false,
        x: 'no',
        y: 'no',
        dragCircleStyle: {
            margin: '0px',
            top: '0px',
            left: '0px',
            display: 'none',
            width: '75px',
            height: '75px',
    },
    // joystick valules
    joystick: {
        vertical: 0,
        horizontal: 0,
    },
    // publisher
    pubInterval: null,
},
    methods: {
        connect: function() {
            // define ROSBridge connection object
            this.ros = new ROSLIB.Ros({
                url: this.rosbridge_address
            })

            // define callbacks
            this.ros.on('connection', () => {
                this.connected = true
                console.log('Connection to ROSBridge established!')
                let topic = new ROSLIB.Topic({
                    ros: this.ros,
                    name: '/jackal_velocity_controller/odom',
                    messageType: 'nav_msgs/Odometry'
                })
                topic.subscribe((message) => {
                    this.position = message.pose.pose.position
                    console.log(`fence mode is ${this.fenceMode}`)
                    if (this.fenceMode) {
                        this.stayOnTheFence(message.pose.pose.position)
                    }
                })
            })
            this.ros.on('error', (error) => {
                console.log('Something went wrong when trying to connect')
                console.log(error)
            })
            this.ros.on('close', () => {
                this.connected = false
                console.log('Connection to ROSBridge was closed!')
                clearInterval(this.pubInterval)
            })
            this.ros.on('connection', () => {
                this.logs.unshift((new Date()).toTimeString() + ' - Connected!')
                this.connected = true
                this.loading = false
                this.setCamera()
            })
            this.ros.on('close', () => {
                this.logs.unshift((new Date()).toTimeString() + ' - Disconnected!')
                this.connected = false
                this.loading = false
                document.getElementById('divCamera').innerHTML = ''
            })
        },
        publish: function() {
            let topic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            })
            let message = new ROSLIB.Message({
                linear: { x: this.joystick.vertical, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: this.joystick.horizontal, },
            })
            topic.publish(message)
        },
        //Camera Function
        setCamera: function() {
            let without_wss = this.rosbridge_address.split('wss://localhost:9090')[1]
            console.log(without_wss)
            let domain = without_wss.split('/')[0] + '/' + without_wss.split('/')[1]
            console.log(domain)
            let host = domain + '/cameras'
            let viewer = new MJPEGCANVAS.Viewer({
                divID: 'divCamera',
                host: host,
                width: 320,
                height: 240,
                topic: '/camera/rgb/image_raw',
                ssl: true,
            })
        },
        disconnect: function() {
            this.ros.close()
        },
        sendCommand: function() {
            let topic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            })
            let message = new ROSLIB.Message({
                linear: { x: 10, y: 0, z: 0, },
                //angular: { x: 0, y: 0, z: 0.5, },
            })
            topic.publish(message)
        
        },
        //Camera Function Ends here
        startDrag() {
            this.dragging = true
            this.x = this.y = 0
        },
        stopDrag() {
            this.dragging = false
            this.x = this.y = 'no'
            this.dragCircleStyle.display = 'none'
            this.resetJoystickVals()
        },
        doDrag(event) {
            if (this.dragging) {
                this.x = event.offsetX
                this.y = event.offsetY
                let ref = document.getElementById('dragstartzone')
                this.dragCircleStyle.display = 'inline-block'

                let minTop = ref.offsetTop - parseInt(this.dragCircleStyle.height) / 2
                let maxTop = minTop + 200
                let top = this.y + minTop
                this.dragCircleStyle.top = `${top}px`

                let minLeft = ref.offsetLeft - parseInt(this.dragCircleStyle.width) / 2
                let maxLeft = minLeft + 200
                let left = this.x + minLeft
                this.dragCircleStyle.left = `${left}px`

                this.setJoystickVals()
            }
        },
        setJoystickVals() {
            this.joystick.vertical = -1 * ((this.y / 200) - 0.5)
            this.joystick.horizontal = +1 * ((this.x / 200) - 0.5)
        },
        resetJoystickVals() {
            this.joystick.vertical = 0
            this.joystick.horizontal = 0
        },
        turnRight: function() {
            let topic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            })
            let message = new ROSLIB.Message({
                linear: { x: 0, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 5, },
            })
            topic.publish(message)
        },
        stop: function() {
            let topic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            })
            let message = new ROSLIB.Message({
                linear: { x: 0, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 0, },
            })
            topic.publish(message)
        },
        switchFenceMode: function() {
            this.fenceMode = !this.fenceMode
        },
        stayOnTheFence: function(position) {
            let topicToPublish = new ROSLIB.Topic({
                ros: this.ros,
                name: '/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            })
            if (position.x > -0.5 && position.x < 0.5 && position.y > -0.5 && position.y < 0.5) {
                // we are inside the fence!
                this.insideFence = true
                let message = new ROSLIB.Message({
                    linear: { x: 0.5, y: 0, z: 0, },
                    angular: { x: 0, y: 0, z: 0, },
                })
                topicToPublish.publish(message)
            } else {
                // we are outside the fence!
                this.insideFence = false
                let message = new ROSLIB.Message({
                    linear: { x: 0.5, y: 0, z: 0, },
                    angular: { x: 0, y: 0, z: 0.5, },
                })
                topicToPublish.publish(message)
            }
        },
    },
    mounted() {
        // page is ready
        console.log('page is ready!')
        window.addEventListener('mouseup', this.stopDrag)
    },
})