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

<style>
div.array-input-container {
    width: 20em;
    flex: 1;
    background: var(--background-modifier-form-field);
    border: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
    font-family: 'Inter', sans-serif;
    padding: 4px;
    font-size: 16px;
    border-radius: 6px;
    outline: none;
    overflow: auto;
    display: flex;
}

div.array-item {
    background-color: var(--text-accent);
    padding: 0px 6px 0px 5px;
    border-radius: 4%;
    margin: 0 1.5px;
    height: fit-content;
    white-space: nowrap;
}
div.array-item-title {
    color: white;
    display: inline-block;
}
div.array-item-delete-indicator {
    width: 1.5px;
    height: 8px;
    background-color: rgb(196, 196, 196);
    transform: rotate(45deg);
    display: inline-block;
    margin-left: 2px;
}
div.array-item-delete-indicator::after {
    content: '';
    display: block;
    width: 1.5px;
    height: 8px;
    background-color: rgb(196, 196, 196);
    transform: rotate(-90deg);
}

div.array-item-delete-indicator:hover
{
    background-color: white;
}

div.array-item-delete-indicator:hover:after {
    background-color: white;
}

div.array-input {    
    /* flex: 1; */
    width: 100%;
    height: 100%;
    padding: 0 2px;
    white-space: nowrap;
    overflow: auto;
}

</style>