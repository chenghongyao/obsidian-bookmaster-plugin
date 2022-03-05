<template>
    <div class="array-input-container" @click="onClick">
        <div class="array-item" v-for="(item,index) in array" :key="index">
            <div class="array-item-title">{{item}}</div>
            <div class="array-item-delete-indicator" @click="onDeleteItem($event,index)"/>
        </div>
        <div contenteditable="true" class="array-input" ref="input"
        @keypress.enter="onEnter"
        @keypress.space="onEnter"
        @keydown.delete="onDelete"/>
    </div>  
</template>
<script>
export default {
    props: {
        array: Array,
    },
    methods: {
        onClick() {
            this.$refs.input.focus();
        },
        onEnter(e) {
            e.preventDefault();
            const text = this.$refs.input.textContent.trim()
            if (text) {
                this.array.push(text);
                this.$emit("change");
            }
            this.$refs.input.textContent = "";
        },

        onDeleteItem(e,index) {
            this.array.splice(index,1);
            this.$emit("change");
        },

        onDelete(e) {
            if (!this.$refs.input.textContent && this.array.length > 0) {
                this.onDeleteItem(e,this.array.length-1);
            }
        }
    }
}
</script>