
const vnodeType = {
    HTML:'HTML',
    TEXT:'TEXT',
    COMPONENT:'COMPONENT',
    CLASS_COMPONENT:'CLASS_COMPONENT'
}

const childrenType = {
    EMPTY:'EMPTY',
    SINGLE:'SINGLE',
    MULTIPLE:'MULTIPLE',
}

// 新建虚拟Dom
function createElement (tag,data,children=null) {
    let flag 
    if (typeof tag == 'string') {
        flag = vnodeType.HTML
    } else if(typeof tag == 'function') {
        flag = vnodeType.COMPONENT
    } else{
        flag = vnodeType.TEXT
    }

    let childrenFlag 
    if (children == null) {
        childrenFlag = childrenType.EMPTY
    }else if (Array.isArray(children)){
        let length = children.length
        if (length === 0) {
            childrenFlag = childrenType.EMPTY
        }else {
            childrenFlag = childrenType.MULTIPLE
        }
    }else {
        childrenFlag = childrenType.SINGLE
        children = createTextVnode(children)
        console.log(children)
    }
    // 返回vnode
    return {
        flag, // vnode类型
        tag, // 标签, div 文本没有tag,组件就是函数
        data,
        key:data && data.key,
        children,
        childrenFlag,
        el:null
    }
}

// 新建文本类型的vnode
function createTextVnode (text) {
    return {
        flag:vnodeType.TEXT,
        tag:null,
        data:null,
        children:text,
        childrenFlag:childrenType.EMPTY
    }
}

function render (vnode, container) {
    // 区分周次渲染和再次渲染
    if(container.vnode){
        //更新操作
        patch(container.vnode,vnode,container)
    }else{
        //首次加载
        mount (vnode, container)
    }
    container.vnode = vnode
}

function patch (prev, next, container) {
    let nextFlag = next.flag
    let preFlag = next.flag
   
    // pre是text next后是p元素
    if(nextFlag !== preFlag) {
        replaceVnode(prev, next, container)
    }else if (nextFlag == vnodeType.HTML) {
        patchElement(prev, next, container)
    }else if (nextFlag == vnodeType.TEXT) {
        patchText(prev, next, container)
    }
}

function patchElement(prev, next, container) {
    // 判断2个标签是不是一样的
    if(prev.tag !== next.tag) {
        replaceVnode(prev, next, container)
        return;
    }
    let el = (next.el = prev.el)
    console.log(next.data)
    console.log(prev.data)
    let prevData = prev.data
    let nextData = next.data
    if (nextData) { // 改变之前就有的属性的值
        for (let key in nextData) {
            let prevVal = prevData[key]
            let nextVal = nextData[key]
            patchData(el, key, prevVal, nextVal)
        }
    }
    if (prevData){
        for (let key in prevData) {
            let prevVal = prevData[key]
            if(prevVal && !nextData.hasOwnProperty(key)){
                // 之前就有的值，并且即将更新新的数据中不含有这个属性值
                patchData(el, key, prevVal, null)
            }
        }
    }
   
    // data更新完毕 下面更新子元素
     patchChildren(
        prev.childrenFlag,
        next.childrenFlag,
        prev.children,
        next.children,
        el
    )
}

function  patchChildren(
    prevChildrenFlag,
    nextChildrenFlag,
    prevChildren,
    nextChildren,
    container
) {
    // 更新在子元素
    // 1.老的是单独的
    //      老的是空的
    //      老的是多个

    // 2. 新的是单独的
    //       新的是空
    //       新的是多个
    switch (prevChildrenFlag) {
        case childrenType.SINGLE:
            switch (nextChildrenFlag) {
                case childrenType.SINGLE:
                    patch(prevChildren, nextChildren, container)
                break;
                case childrenType.EMPTY:
                    container.removeChild(prevChildren.el)
                break;
                case childrenType.MULTIPLE:
                    container.removeChild(prevChildren.el)
                    for (let i=0; i<nextChildren.length; i++){
                        mount(nextChildren[i], container)
                    }
                break;
            }
            break;

        case childrenType.EMPTY:
                switch (nextChildrenFlag) {
                    case childrenType.SINGLE:
                        mount(nextChildren, container)
                    break;
                    case childrenType.EMPTY:
                
                    break;
                    case childrenType.MULTIPLE:
                        for (let i=0; i<nextChildren.length; i++){
                            mount(nextChildren[i], container)
                        }
                    break;
                }
            
                break;
        case childrenType.MULTIPLE:
                switch (nextChildrenFlag) {
                    case childrenType.SINGLE:
                        for (let i=0; i<prevChildren.length; i++){
                            container.removeChild(prevChildren[i].el)
                        }
                        mount(nextChildren,container)
                    break;
                    case childrenType.EMPTY:
                        for (let i=0; i<prevChildren.length; i++){
                            container.removeChild(prevChildren[i].el)
                        }
                    break;
                    case childrenType.MULTIPLE:
                        console.log('新老都是数组')
                        // 众多虚拟dom 在这里进行区分
                        // 老的是个数组，新的也是个数组
                        let lastIndex = 0
                        for(let i=0; i<nextChildren.length; i++){
                            let nextVnode = nextChildren[i]
                            let j = 0
                            let find = false
                            for(j; j<prevChildren.length; j++){
                                let prevVnode =  prevChildren[j]
                                if (prevVnode.key === nextVnode.key){
                                    find = true
                                    // key相同，我们认为同一个元素
                                    patch(prevVnode, nextVnode, container)
                                    if(j<lastIndex) {
                                        // 需要移动
                                        //insertBefor移动元素
                                        let flagNode = nextChildren[i-1].el.nextSibling
                                        container.insertBefore(prevVnode.el, flagNode)
                                    }else {
                                        lastIndex = j
                                    }
                                }
                            }
                            if(!find) {
                                // 没有找到需要新增
                                let flagNode = i ===0 ? prevChildren[0].el : nextChildren[i-1].el.nextSibling
                                mount(nextVnode, container)
                            }
                        }
                        // 移除不需要的元素
                        for(i=0; i<prevChildren.length; i++){
                            const prevVnode = prevChildren[i]
                            const has = nextChildren.find(next=> next.key === prevVnode.key)
                            if(!has) {
                                container.removeChild(prevVnode.el)
                            }
                        }
                    break;
                }
            
                break;
    }
}

function patchText(prev, next, container) {
    let el = (next.el = prev.el) 
    if (next.children !== prev.children) {
        el.nodeValue = next.children
    }
}

function replaceVnode(prev, next, container) {
    container.removeChild(prev)
    mount(next, container)
}

// 首次挂载元素
function mount (vnode, container, flagNode) {
    let {flag} = vnode

    if (flag == vnodeType.HTML) {
        mountElement(vnode, container, flagNode)
    }else if (flag == vnodeType.TEXT) {
        mountText(vnode, container)
    }
}

function  mountElement(vnode, container, flagNode) {
    let dom = document.createElement(vnode.tag)
    vnode.el = dom
    let {data, children, childrenFlag} = vnode
    // 挂载data 属性
    if (data) {
        for (let key in data) {

            //节点，名字，老的值， 新的值
            patchData(dom, key, null, data[key])
        }
    }

    if(childrenFlag !== childrenType.EMPTY) {
        if (childrenFlag == childrenType.SINGLE) {
            mount(children, dom)
        } else if (childrenFlag == childrenType.MULTIPLE) {
            for (let i = 0; i<children.length; i++){
                mount(children[i], dom)
            }
        }
    }
    console.log(dom)
    flagNode ? container.insertBefore(dom, flagNode): container.appendChild(dom)
}

function patchData(el, key, prev, next) {
    switch(key) {
        case "style":
            console.log(el)
            for (let key in next) {
                el.style[key] = next[key]
            }
            for (let key in prev) {
                if (!next.hasOwnProperty(key)){
                    el.style[k] = ''
                }
                el.style[key] = prev[key]
            }
            break
        case 'class':
            el.className = next
            break
        default:
            if(key[0] === '@'){
                if (prev) {
                    el.removeEventListener(key.slice(1),prev)
                }
                if(next) {
                    el.addEventListener(key.slice(1),next)
                }
            }  else {
                el.setAttribute(key, next)
            } 
        break; 
    }
}

function mountText(vnode, container) {
    let dom = document.createTextNode(vnode.children)
    vnode.el = dom
    container.appendChild(dom)
}