// //================xx No. a===================================

// (function () {
//     var a = (b = 5);
// })();
// console.log(b);


// //================xx No. b===================================

// const array = [1, 2, 3, 1, 1, 2, 2, 4, 5, 6, true, true, "a", "b", "b"]

// const unique = array.filter((item, index) => array.indexOf(item) === index)
// const unique1 = [...new Set(array)];
// const unique3 = array.reduce((arr, item) => (arr.includes(item) ? arr : [...arr, item]), []);

// console.log(unique3)


// //================xx No. c===================================

// function foo() {
//     console.log(foo === foo);
//     console.log("1234" == 1234);
//     console.log(2 / 4 * 5);
//     //console.log([].reduce());
// }
// foo();

// //================xx No. d===================================

// let condition1 = false;
// let condition2 = true;
// let condition3 = true;

// if (condition1 && condition2 && condition3) {
//     console.log("Samjhe Bhai");
// }
// else{
//     console.log("nhi Samjha Bhai");
// }


// //================xx No. e===================================

// let array = [{ docId: 1 }, { docId: 2 }, { docId: 3 }, { docId: 4 }, { docId: 5 }]
// const chunkSize = 3;
// for (let i = 0; i < array.length; i += chunkSize) {
//     const chunk = array.slice(i, i + chunkSize);
//     console.log(chunk);
//     // do whatever
// }

// var result = array.reduce((resultArray, item, index) => {
//     const chunkIndex = Math.floor(index / chunkSize)

//     if (!resultArray[chunkIndex]) {
//         resultArray[chunkIndex] = [] // start a new chunk
//     }

//     resultArray[chunkIndex].push(item)

//     return resultArray
// }, [])

// console.log(result);

// //================xx No. 1===================================

// // Find the missing number in the array
// //You are given an array of positive numbers from 1 to n such that 
// //all numbers from 1 to n are present except one number x. 
// //You have to find x. The input array is not sorted. 
// // n=8
// let givenArray = [3, 7, 1, 2, 8, 4, 5];
// let n = 8;

// let sum_of_numbers = 0;
// let expected_sum = 0;
// let missingNumber;

// givenArray.map((num, index) => {
//     sum_of_numbers += givenArray[index];
// })

// expected_sum = n * (n + 1) / 2;
// missingNumber = expected_sum - sum_of_numbers;
// console.log("missingNumber:- " + missingNumber);

// //=======================xx No. 2================================

// //Determine if the sum of two integers is equal to the given value
// //Given an array of integers and a value, determine if there are any two integers in the array 
// //whose sum is equal to the given value. Return true if the sum exists and return false if it does not. 
// //Consider this array and the target sums:

// let givenArray2 = [5, 7, 1, 2, 8, 4, 3];
// //Target Sum || 10 || 7+3=10, 2+8=10
// //Target Sum || 19 || No 2 values sum up to 19

// let sum = 0;
// let targetSum = 10;
// let statusVar = false;

// for (let i = 0; i < givenArray2.length; i++) {
//     for (let j = i + 1; j < givenArray2.length; j++) {
//         if (targetSum == givenArray2[i] + givenArray2[j]) {
//             statusVar = true;
//         }
//     }
// }

// console.log(statusVar);

// //====================xx No. 3=====================

// //Reverse Words in a Sentence 
// //Reverse the order of words in a given sentence (an array of characters).

// let string = "Hello World";

// function reverseBySeprator(string, seprator) {
//     return string.split(seprator).reverse().join(seprator);
// }

// let reverse = reverseBySeprator(string, "");
// let reverseAgain = reverseBySeprator(reverse, " ")
// console.log(reverse);
// console.log(reverseAgain);

// //===================xx No.4 ====================

// //check array type
// let arr = ['kanak', 1, 2, true, 'Amit', 'Gaurav', { "Key": "value" }]
// let arr1 = {};
// console.log(Array.isArray(arr));
// console.log(typeof arr1 === 'object');

// //================xx No.5 ========================

// function memoizedAddTo256() {
//     var cache = {};

//     return function (num) {
//         if (num in cache) {
//             console.log("cached value");
//             return cache[num]
//         }
//         else {
//             console.log("normal");
//             cache[num] = num + 256;
//             return cache[num];
//         }
//     }
// }
// var memoizedFunc = memoizedAddTo256();

// console.log(memoizedFunc(20)); // Normal return
// console.log(memoizedFunc(20)); // Cached return

// //================xx No.6 ========================

// let array = [1, 2, 3, 4, 5, "abc", 5];
// const onlyNum = (num) => isNaN(num) ? 0 : num;
// const sum1 = array.reduce((prev, curr) => onlyNum(prev) + onlyNum(curr), 50);
// console.log(sum1);

//================xx No.7 ========================

// const mySet = new Set();
// mySet.add(1)
// mySet.add(1)
// mySet.add('a')
// mySet.add('a')
// mySet.add(undefined)
// mySet.add(undefined)
// mySet.add({prop:true})
// mySet.add({prop:true})

// console.log(mySet.size);

// function myFunction(y1,y2, ...y3) {
//     const [x1,...[result]] = y3;
//     console.log(result);
// }

// const myArray = ['a','b','c','d','e']
// myFunction(...myArray);

// function myFunction(params = false) {
//     console.log(params);
// }

// myFunction();

const myArray = new Array(2);
myArray[1] = 1;
myArray[3] = 3;
console.log(myArray.length);
