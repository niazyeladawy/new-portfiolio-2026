// Input: [1, 10, 2, 20, 10, 3]

// Check:
// 10 → (10-1=9 ✓, 10-2=8 ✓) → peak ✔
// 20 → (20-2=18 ✓, 20-10=10 ✓) → peak ✔

// Output = 2


function getCount(inputs){

    let items = []

    for(let i = 1 ; i < inputs.length -1 ; i++){
        // console.log(inputs[i]);
        if((Math.abs(inputs[i] - inputs[i -1 ]) >= 5) && (Math.abs(inputs[i] - inputs[i +1 ]) >= 5) ){
            items.push(inputs[i])
        }
    }

    return items

}


console.log(getCount([1, 10, 2, 20, 10, 3]));